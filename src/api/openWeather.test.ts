import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rawAir, rawCurrent, rawForecast, rawGeoParis } from '../test/fixtures';
import { fetchWeatherBundle, searchPlaces, WeatherApiError } from './openWeather';

const KEY = 'test-key-123';

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => vi.stubEnv('VITE_OPENWEATHER_API_KEY', KEY));
afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe('fetchWeatherBundle', () => {
    it('loads current, forecast and air quality with metric units', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
            const url = new URL(String(input));
            if (url.pathname === '/data/2.5/weather') return json(rawCurrent());
            if (url.pathname === '/data/2.5/forecast') return json(rawForecast());
            if (url.pathname === '/data/2.5/air_pollution') return json(rawAir);
            throw new Error(`unexpected ${url.pathname}`);
        });

        const bundle = await fetchWeatherBundle({ kind: 'query', query: '  London ' });

        expect(bundle.place).toMatchObject({ name: 'London', country: 'GB' });
        expect(bundle.forecast?.points).toHaveLength(40);
        expect(bundle.air?.aqi).toBe(2);

        const first = new URL(String(fetchMock.mock.calls[0]![0]));
        expect(first.searchParams.get('q')).toBe('London');
        expect(first.searchParams.get('units')).toBe('metric');
        expect(first.searchParams.get('appid')).toBe(KEY);
    });

    it('still returns current conditions when forecast and air fail', async () => {
        vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
            const url = new URL(String(input));
            if (url.pathname === '/data/2.5/weather') return json(rawCurrent());
            return json({ cod: 500 }, 500);
        });
        const bundle = await fetchWeatherBundle({ kind: 'query', query: 'London' });
        expect(bundle.current.temp).toBe(18.41);
        expect(bundle.forecast).toBeNull();
        expect(bundle.air).toBeNull();
    });

    it.each([
        [404, 'not-found'],
        [401, 'invalid-key'],
        [429, 'rate-limited'],
        [503, 'server'],
    ] as const)('maps HTTP %i to %s without leaking the key', async (status, kind) => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ cod: status, message: 'x' }, status));
        const err = await fetchWeatherBundle({ kind: 'query', query: 'Nowhere' }).catch(e => e);
        expect(err).toBeInstanceOf(WeatherApiError);
        expect(err.kind).toBe(kind);
        expect(err.message).not.toContain(KEY);
    });

    it('reports network failures', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
        await expect(fetchWeatherBundle({ kind: 'query', query: 'London' })).rejects.toMatchObject({ kind: 'network' });
    });

    it('fails fast without an API key', async () => {
        vi.stubEnv('VITE_OPENWEATHER_API_KEY', '');
        const fetchMock = vi.spyOn(globalThis, 'fetch');
        await expect(fetchWeatherBundle({ kind: 'query', query: 'London' })).rejects.toMatchObject({
            kind: 'missing-key',
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe('searchPlaces', () => {
    it('returns normalized places', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(rawGeoParis));
        const places = await searchPlaces('Paris');
        expect(places.map(p => [p.name, p.state, p.country])).toEqual([
            ['Paris', 'Ile-de-France', 'FR'],
            ['Paris', 'Texas', 'US'],
        ]);
        expect(places[0]!.id).toBe('48.86,2.32');
    });

    it('skips the request for blank input', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch');
        expect(await searchPlaces('   ')).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
