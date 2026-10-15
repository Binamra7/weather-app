import type { RawOmAirQuality, RawOmForecast, RawOmGeoSearch, RawReverseGeocode } from '../api/openMeteoTypes';
import { NOW } from './fixtures';

/** Shapes mirror real Open-Meteo responses for Kathmandu (UTC+05:45). */

export const KTM_OFFSET = 20700;
const DAYS = 6;
/** Local midnight on the day containing NOW, as unix seconds. */
export const KTM_MIDNIGHT = Math.floor((NOW + KTM_OFFSET) / 86400) * 86400 - KTM_OFFSET;

type HourOverrides = Partial<{ code: number; pop: number; precip: number }>;

export function omForecast(hourOverrides: Record<number, HourOverrides> = {}): RawOmForecast {
    const hours = DAYS * 24;
    const at = <T>(fn: (i: number) => T) => Array.from({ length: hours }, (_, i) => fn(i));
    const days = (fn: (d: number) => number) => Array.from({ length: DAYS }, (_, d) => fn(d));
    return {
        latitude: 27.7,
        longitude: 85.32,
        utc_offset_seconds: KTM_OFFSET,
        timezone: 'Asia/Kathmandu',
        current: {
            time: NOW,
            temperature_2m: 18,
            apparent_temperature: 20.2,
            relative_humidity_2m: 91,
            is_day: 0,
            weather_code: 0,
            cloud_cover: 7,
            pressure_msl: 1016.3,
            wind_speed_10m: 0.34,
            wind_direction_10m: 207,
            wind_gusts_10m: 1.2,
            visibility: 7980,
        },
        hourly: {
            time: at(i => KTM_MIDNIGHT + i * 3600),
            temperature_2m: at(i => 15 + 8 * Math.sin(((i % 24) - 8) / 4)),
            apparent_temperature: at(i => 15 + 8 * Math.sin(((i % 24) - 8) / 4)),
            relative_humidity_2m: at(() => 80),
            precipitation_probability: at(i => hourOverrides[i]?.pop ?? 0),
            precipitation: at(i => hourOverrides[i]?.precip ?? 0),
            weather_code: at(i => hourOverrides[i]?.code ?? 0),
            wind_speed_10m: at(() => 1.5),
            is_day: at(i => (i % 24 >= 6 && i % 24 < 18 ? 1 : 0)),
        },
        daily: {
            time: days(d => KTM_MIDNIGHT + d * 86400),
            temperature_2m_max: days(() => 23.8),
            temperature_2m_min: days(() => 12.4),
            precipitation_sum: days(() => 0),
            precipitation_probability_max: days(() => 0),
            sunrise: days(d => KTM_MIDNIGHT + d * 86400 + 6 * 3600),
            sunset: days(d => KTM_MIDNIGHT + d * 86400 + 17.5 * 3600),
        },
    };
}

export const omAir: RawOmAirQuality = {
    current: { time: NOW, european_aqi: 57, pm2_5: 45.6, pm10: 51.1, ozone: 60, nitrogen_dioxide: 12 },
};

export const omGeoKathmandu: RawOmGeoSearch = {
    results: [
        {
            id: 1283240,
            name: 'Kathmandu',
            latitude: 27.70169,
            longitude: 85.3206,
            country: 'Nepal',
            country_code: 'NP',
            admin1: 'Bagmati Province',
        },
    ],
};

export const omReverse: RawReverseGeocode = {
    latitude: 27.7172,
    longitude: 85.324,
    city: 'Kathmandu',
    locality: 'Kathmandu',
    principalSubdivision: 'Bagmati',
    countryCode: 'NP',
};
