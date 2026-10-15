import {
    normalizeOmAir,
    normalizeOmCurrent,
    normalizeOmForecast,
    placeFromOmGeo,
    placeFromReverse,
} from '../lib/normalizeOpenMeteo';
import type { Place, WeatherBundle } from '../lib/types';
import { getJson, WeatherApiError } from './errors';
import type { RawOmAirQuality, RawOmForecast, RawOmGeoSearch, RawReverseGeocode } from './openMeteoTypes';
import type { WeatherProvider, WeatherTarget } from './provider';

/**
 * Open-Meteo client (https://open-meteo.com). No API key: the free tier allows non-commercial
 * use (no ads or subscriptions) up to 10,000 calls a day, and requires CC BY 4.0 attribution,
 * which the footer provides. See openMeteoTypes.ts for the endpoints used.
 */
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

/** Today plus five days, like the OpenWeather forecast. */
const FORECAST_DAYS = 6;

function url(base: string, params: Record<string, string | number>): URL {
    const u = new URL(base);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
    return u;
}

const COMMON = { timezone: 'auto', timeformat: 'unixtime' };

async function geocode(query: string, count: number, signal?: AbortSignal): Promise<Place[]> {
    const q = query.trim();
    if (!q) return [];
    const res = await getJson<RawOmGeoSearch>(url(GEO_URL, { name: q, count, language: 'en', format: 'json' }), signal);
    return (res.results ?? []).map(placeFromOmGeo);
}

export function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
    return geocode(query, 5, signal);
}

export async function reverseGeocode(lat: number, lon: number, signal?: AbortSignal): Promise<Place | null> {
    const res = await getJson<RawReverseGeocode>(
        url(REVERSE_URL, { latitude: lat, longitude: lon, localityLanguage: 'en' }),
        signal
    );
    return placeFromReverse(res, lat, lon);
}

export async function fetchWeatherBundle(target: WeatherTarget, signal?: AbortSignal): Promise<WeatherBundle> {
    let place: Place;
    if (target.kind === 'query') {
        const [first] = await geocode(target.query, 1, signal);
        if (!first) throw new WeatherApiError('not-found', 404);
        place = first;
    } else {
        place = { ...target.place, name: target.place.name || 'Current location' };
    }

    const coords = { latitude: place.lat, longitude: place.lon };
    const [weatherRes, airRes] = await Promise.allSettled([
        getJson<RawOmForecast>(
            url(FORECAST_URL, {
                ...coords,
                ...COMMON,
                wind_speed_unit: 'ms',
                forecast_days: FORECAST_DAYS,
                current:
                    'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,cloud_cover,' +
                    'pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility',
                hourly:
                    'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,' +
                    'precipitation,weather_code,wind_speed_10m,is_day',
                daily:
                    'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,' +
                    'sunrise,sunset',
            }),
            signal
        ),
        getJson<RawOmAirQuality>(
            url(AIR_URL, { ...coords, ...COMMON, current: 'european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide' }),
            signal
        ),
    ]);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    // Current conditions and the forecast arrive in one response, so only air quality can fail alone.
    if (weatherRes.status === 'rejected') throw weatherRes.reason;

    const raw = weatherRes.value;
    let forecast = null;
    try {
        forecast = normalizeOmForecast(raw);
    } catch {
        // A malformed forecast shouldn't hide current conditions.
    }

    return {
        place,
        current: normalizeOmCurrent(raw),
        forecast,
        air: airRes.status === 'fulfilled' ? normalizeOmAir(airRes.value) : null,
        fetchedAt: Date.now(),
    };
}

export const openMeteo: WeatherProvider = {
    id: 'open-meteo',
    name: 'Open-Meteo',
    url: 'https://open-meteo.com/',
    forecastNote: 'Built from Open-Meteo’s hourly forecast, grouped into 3-hour slots.',
    isConfigured: () => true,
    searchPlaces,
    reverseGeocode,
    fetchWeatherBundle,
};
