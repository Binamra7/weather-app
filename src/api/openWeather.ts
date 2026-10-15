import { normalizeAir, normalizeCurrent, normalizeForecast, placeFromCurrent, placeFromGeo } from '../lib/normalize';
import type { Place, WeatherBundle } from '../lib/types';
import { getJson, WeatherApiError } from './errors';
import type { RawAirPollution, RawCurrent, RawForecast, RawGeoResult } from './openWeatherTypes';
import type { WeatherProvider, WeatherTarget } from './provider';

// Re-exported so existing imports from this module keep working.
export { isAbortError, WeatherApiError, type WeatherErrorKind } from './errors';
export type { WeatherTarget } from './provider';

/**
 * OpenWeather client. Runs entirely in the browser — there is no backend.
 *
 * The key is read from VITE_OPENWEATHER_API_KEY at build time and is therefore embedded in
 * the shipped JavaScript. Treat it as a *publishable* key: anyone can read it from the bundle.
 * Only free-plan endpoints are used (see openWeatherTypes.ts).
 */
const BASE_URL = 'https://api.openweathermap.org';

export function getApiKey(): string | undefined {
    const key = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined;
    return key && key.trim() ? key.trim() : undefined;
}

async function request<T>(path: string, params: Record<string, string | number>, signal?: AbortSignal): Promise<T> {
    const key = getApiKey();
    if (!key) throw new WeatherApiError('missing-key');

    const url = new URL(path, BASE_URL);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    url.searchParams.set('appid', key);
    return getJson<T>(url, signal);
}

/** City search for autocomplete. Free Geocoding API, up to 5 matches. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
    const q = query.trim();
    if (!q) return [];
    const results = await request<RawGeoResult[]>('/geo/1.0/direct', { q, limit: 5 }, signal);
    // Geocoding can return near-duplicates (same city, different admin records).
    const seen = new Set<string>();
    return results.map(placeFromGeo).filter(p => {
        const k = `${p.name}|${p.state ?? ''}|${p.country ?? ''}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

export async function reverseGeocode(lat: number, lon: number, signal?: AbortSignal): Promise<Place | null> {
    const results = await request<RawGeoResult[]>('/geo/1.0/reverse', { lat, lon, limit: 1 }, signal);
    const first = results[0];
    return first ? { ...placeFromGeo(first), lat, lon } : null;
}

/**
 * Loads everything for one location. Current conditions are required; the forecast and air
 * quality are fetched in parallel and degrade to `null` on failure so a partial outage still
 * shows real data rather than an error screen.
 */
export async function fetchWeatherBundle(target: WeatherTarget, signal?: AbortSignal): Promise<WeatherBundle> {
    const metric = { units: 'metric' };
    let place: Place;
    let rawCurrent: RawCurrent;

    if (target.kind === 'query') {
        rawCurrent = await request<RawCurrent>('/data/2.5/weather', { q: target.query.trim(), ...metric }, signal);
        place = placeFromCurrent(rawCurrent);
    } else {
        place = target.place;
        rawCurrent = await request<RawCurrent>(
            '/data/2.5/weather',
            { lat: place.lat, lon: place.lon, ...metric },
            signal
        );
        // A place from the browser's geolocation may have no name if reverse geocoding failed.
        place = {
            ...place,
            name: place.name || rawCurrent.name || 'Current location',
            country: place.country ?? rawCurrent.sys.country,
        };
    }

    const coords = { lat: place.lat, lon: place.lon };
    const [forecastRes, airRes] = await Promise.allSettled([
        request<RawForecast>('/data/2.5/forecast', { ...coords, ...metric }, signal),
        request<RawAirPollution>('/data/2.5/air_pollution', coords, signal),
    ]);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    return {
        place,
        current: normalizeCurrent(rawCurrent),
        forecast: forecastRes.status === 'fulfilled' ? normalizeForecast(forecastRes.value) : null,
        air: airRes.status === 'fulfilled' ? normalizeAir(airRes.value) : null,
        fetchedAt: Date.now(),
    };
}

export const openWeather: WeatherProvider = {
    id: 'openweather',
    name: 'OpenWeather',
    url: 'https://openweathermap.org/',
    forecastNote: 'Built from OpenWeather’s free 5-day / 3-hour forecast; the last day may be partial.',
    isConfigured: () => Boolean(getApiKey()),
    searchPlaces,
    reverseGeocode,
    fetchWeatherBundle,
};
