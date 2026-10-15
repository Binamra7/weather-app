import { afterEach, describe, expect, it, vi } from 'vitest';
import { conditionFromWmo } from '../lib/conditions';
import { aqiBand } from '../lib/normalizeOpenMeteo';
import { KTM_MIDNIGHT, omAir, omForecast, omGeoKathmandu, omReverse } from '../test/openMeteoFixtures';
import { fetchWeatherBundle, reverseGeocode, searchPlaces } from './openMeteo';
import { getProvider } from './weather';

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function mockOpenMeteo(handlers: Partial<Record<'forecast' | 'air' | 'geo', () => Response>> = {}) {
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
        const url = new URL(String(input));
        if (url.hostname === 'api.open-meteo.com') return handlers.forecast?.() ?? json(omForecast());
        if (url.hostname === 'air-quality-api.open-meteo.com') return handlers.air?.() ?? json(omAir);
        if (url.hostname === 'geocoding-api.open-meteo.com') return handlers.geo?.() ?? json(omGeoKathmandu);
        throw new Error(`Unhandled ${url.href}`);
    });
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe('Open-Meteo fetchWeatherBundle', () => {
    it('geocodes a query, then loads current conditions, a 3-hour forecast and air quality', async () => {
        const fetchMock = mockOpenMeteo();
        const bundle = await fetchWeatherBundle({ kind: 'query', query: 'Kathmandu' });

        expect(bundle.place).toMatchObject({ name: 'Kathmandu', country: 'NP', state: 'Bagmati Province' });
        expect(bundle.current).toMatchObject({ temp: 18, timezone: 20700, windSpeed: 0.34, visibility: 7980 });
        expect(bundle.current.condition).toMatchObject({ description: 'clear sky', kind: 'clear', isDay: false });
        expect(bundle.forecast?.points).toHaveLength(48);
        expect(bundle.forecast!.points[1]!.dt - bundle.forecast!.points[0]!.dt).toBe(3 * 3600);
        expect(bundle.forecast?.daily).toHaveLength(6);
        expect(bundle.air).toMatchObject({ aqi: 3, pm2_5: 45.6, o3: 60 });

        const forecastUrl = new URL(String(fetchMock.mock.calls[1]![0]));
        expect(forecastUrl.searchParams.get('latitude')).toBe('27.70169');
        expect(forecastUrl.searchParams.get('wind_speed_unit')).toBe('ms');
        expect(forecastUrl.searchParams.get('timeformat')).toBe('unixtime');
    });

    it('sums precipitation and takes the highest chance within each 3-hour slot', async () => {
        mockOpenMeteo({
            forecast: () =>
                json(omForecast({ 12: { pop: 20, precip: 0.2 }, 13: { pop: 53, precip: 0.2 }, 14: { precip: 0.1 } })),
        });
        const bundle = await fetchWeatherBundle({ kind: 'place', place: placeKtm() });
        const slot = bundle.forecast!.points.find(p => p.dt === KTM_MIDNIGHT + 12 * 3600)!;
        expect(slot.pop).toBeCloseTo(0.53);
        expect(slot.precip).toBeCloseTo(0.5);
    });

    it('does not let one drizzly hour turn a dry day into a drizzle day', async () => {
        mockOpenMeteo({ forecast: () => json(omForecast({ 12: { code: 51, pop: 20, precip: 0.1 } })) });
        const bundle = await fetchWeatherBundle({ kind: 'place', place: placeKtm() });
        expect(bundle.forecast!.daily[0]!.condition.kind).toBe('clear');
    });

    it('reports an unknown place as not found', async () => {
        mockOpenMeteo({ geo: () => json({ generationtime_ms: 0.1 }) });
        await expect(fetchWeatherBundle({ kind: 'query', query: 'Atlantisxyz' })).rejects.toMatchObject({
            kind: 'not-found',
        });
    });

    it('still returns the weather when air quality fails', async () => {
        mockOpenMeteo({ air: () => json({ error: true, reason: 'x' }, 500) });
        const bundle = await fetchWeatherBundle({ kind: 'place', place: placeKtm() });
        expect(bundle.current.temp).toBe(18);
        expect(bundle.air).toBeNull();
    });

    it('maps forecast errors to user-facing kinds', async () => {
        mockOpenMeteo({ forecast: () => json({ error: true, reason: 'Too many requests' }, 429) });
        await expect(fetchWeatherBundle({ kind: 'place', place: placeKtm() })).rejects.toMatchObject({
            kind: 'rate-limited',
        });
    });
});

describe('Open-Meteo places', () => {
    it('searches by name', async () => {
        mockOpenMeteo();
        const places = await searchPlaces('Kathm');
        expect(places.map(p => [p.name, p.state, p.country, p.id])).toEqual([
            ['Kathmandu', 'Bagmati Province', 'NP', '27.70,85.32'],
        ]);
    });

    it('names the current location through reverse geocoding', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(omReverse));
        const place = await reverseGeocode(27.7172, 85.324);
        expect(place).toMatchObject({ name: 'Kathmandu', state: 'Bagmati', country: 'NP', lat: 27.7172 });
    });
});

describe('WMO conditions', () => {
    it.each([
        [0, 'clear', 'normal'],
        [2, 'partly-cloudy', 'normal'],
        [45, 'fog', 'normal'],
        [51, 'drizzle', 'light'],
        [61, 'rain', 'light'],
        [65, 'rain', 'normal'],
        [80, 'rain', 'light'],
        [96, 'thunderstorm', 'normal'],
    ] as const)('maps code %i to %s (%s)', (code, kind, intensity) => {
        expect(conditionFromWmo(code)).toMatchObject({ kind, intensity });
    });

    it('falls back for unknown codes', () => {
        expect(conditionFromWmo(42).description).toBe('Conditions unavailable');
        expect(conditionFromWmo(null).kind).toBe('cloudy');
    });

    it('bands the European AQI into five levels', () => {
        expect([0, 20, 21, 40, 57, 80, 81, 140].map(aqiBand)).toEqual([1, 1, 2, 2, 3, 4, 5, 5]);
    });
});

describe('getProvider', () => {
    it('defaults to Open-Meteo, which needs no key', () => {
        vi.stubEnv('VITE_WEATHER_PROVIDER', '');
        vi.stubEnv('VITE_OPENWEATHER_API_KEY', '');
        expect(getProvider().id).toBe('open-meteo');
        expect(getProvider().isConfigured()).toBe(true);
    });

    it('selects OpenWeather and requires its key', () => {
        vi.stubEnv('VITE_WEATHER_PROVIDER', ' OpenWeather ');
        vi.stubEnv('VITE_OPENWEATHER_API_KEY', '');
        expect(getProvider().id).toBe('openweather');
        expect(getProvider().isConfigured()).toBe(false);
    });

    it('falls back to the default for unknown values', () => {
        vi.stubEnv('VITE_WEATHER_PROVIDER', 'darksky');
        expect(getProvider().id).toBe('open-meteo');
    });
});

function placeKtm() {
    return { id: '27.70,85.32', name: 'Kathmandu', country: 'NP', lat: 27.70169, lon: 85.3206 };
}
