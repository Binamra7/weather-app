import { describe, expect, it } from 'vitest';
import { forecastItem, NOW, rawAir, rawCurrent, rawForecast } from '../test/fixtures';
import { kindFromCode, skyTheme, toCondition } from './conditions';
import { aggregateDaily, normalizeAir, normalizeCurrent, normalizeForecast, todayRange } from './normalize';

describe('conditions', () => {
    it.each([
        [211, 'thunderstorm'],
        [301, 'drizzle'],
        [500, 'rain'],
        [511, 'sleet'],
        [601, 'snow'],
        [701, 'fog'],
        [721, 'haze'],
        [761, 'dust'],
        [800, 'clear'],
        [802, 'partly-cloudy'],
        [804, 'overcast'],
    ])('maps code %i to %s', (code, kind) => {
        expect(kindFromCode(code)).toBe(kind);
    });

    it('reads day/night from the icon code', () => {
        expect(toCondition({ id: 800, main: 'Clear', description: 'clear sky', icon: '01n' }).isDay).toBe(false);
        expect(skyTheme({ kind: 'clear', isDay: false })).toBe('clear-night');
        expect(skyTheme({ kind: 'thunderstorm', isDay: true })).toBe('storm');
    });
});

describe('normalizeCurrent', () => {
    it('normalizes a full response', () => {
        const c = normalizeCurrent(rawCurrent());
        expect(c.temp).toBe(18.41);
        expect(c.windDeg).toBe(221);
        expect(c.condition.kind).toBe('overcast');
        expect(c.rain1h).toBeNull();
    });

    it('tolerates missing optional fields', () => {
        const c = normalizeCurrent(
            rawCurrent({ visibility: undefined, wind: undefined, clouds: undefined, rain: { '1h': 0.4 } })
        );
        expect(c.visibility).toBeNull();
        expect(c.windSpeed).toBe(0);
        expect(c.windDeg).toBeNull();
        expect(c.clouds).toBe(0);
        expect(c.rain1h).toBe(0.4);
    });
});

describe('daily aggregation', () => {
    it('groups slots by the location-local date', () => {
        // Two slots at 22:00Z and 01:00Z. In UTC+3 they are both on the next day.
        const day = 1791936000; // 2026-10-14T00:00Z
        const f = normalizeForecast({
            ...rawForecast(),
            list: [forecastItem(day + 22 * 3600, 10), forecastItem(day + 25 * 3600, 8)],
            city: { ...rawForecast().city, timezone: 3 * 3600 },
        });
        expect(f.daily).toHaveLength(1);
        expect(f.daily[0]!.date).toBe('2026-10-15');

        const utc = aggregateDaily(f.points, 0);
        expect(utc.map(d => d.date)).toEqual(['2026-10-14', '2026-10-15']);
    });

    it('computes min, max, max pop and total precipitation', () => {
        const day = 1791936000;
        const f = normalizeForecast({
            ...rawForecast(0),
            list: [
                forecastItem(day + 9 * 3600, 12, { pop: 0.2 }),
                forecastItem(day + 12 * 3600, 17, { pop: 0.8, rain: { '3h': 1.5 } }),
                forecastItem(day + 15 * 3600, 15, { pop: 0.6, rain: { '3h': 0.5 } }),
            ],
        });
        expect(f.daily[0]).toMatchObject({ min: 12, max: 17, pop: 0.8, precip: 2 });
    });

    it('prefers likely precipitation as the representative condition', () => {
        const day = 1791936000;
        const rain = { id: 501, main: 'Rain', description: 'moderate rain', icon: '10d' };
        const f = normalizeForecast({
            ...rawForecast(0),
            list: [
                forecastItem(day + 9 * 3600, 12),
                forecastItem(day + 12 * 3600, 13),
                forecastItem(day + 15 * 3600, 14, { weather: [rain], pop: 0.7 }),
            ],
        });
        expect(f.daily[0]!.condition.kind).toBe('rain');
    });

    it('ignores unlikely precipitation', () => {
        const day = 1791936000;
        const rain = { id: 500, main: 'Rain', description: 'light rain', icon: '10d' };
        const f = normalizeForecast({
            ...rawForecast(0),
            list: [
                forecastItem(day + 9 * 3600, 12),
                forecastItem(day + 12 * 3600, 13),
                forecastItem(day + 15 * 3600, 14, { weather: [rain], pop: 0.2 }),
            ],
        });
        expect(f.daily[0]!.condition.kind).toBe('cloudy');
    });
});

describe('todayRange', () => {
    it('includes the current reading and the rest of the local day', () => {
        const current = normalizeCurrent(rawCurrent({ main: { ...rawCurrent().main, temp: 21 } }));
        const forecast = normalizeForecast(rawForecast(3600, i => (i === 0 ? 16 : i === 1 ? 12 : 30)));
        // NOW is 17:21 local; slots at 19:00 and 22:00 local are today, the rest are not.
        expect(todayRange(current, forecast)).toEqual({ min: 12, max: 21 });
        expect(todayRange(current, null)).toBeNull();
    });
});

describe('normalizeAir', () => {
    it('extracts AQI and key pollutants', () => {
        expect(normalizeAir(rawAir)).toEqual({ aqi: 2, pm2_5: 3.68, pm10: 11.44, o3: 79.61, no2: 5.49 });
    });

    it('rejects empty or out-of-range data', () => {
        expect(normalizeAir({ list: [] })).toBeNull();
        expect(normalizeAir({ list: [{ main: { aqi: 9 }, components: {}, dt: NOW }] })).toBeNull();
    });
});
