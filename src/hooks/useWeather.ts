import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWeatherBundle, isAbortError, WeatherApiError, type WeatherTarget } from '../api/openWeather';
import type { WeatherBundle } from '../lib/types';

/** OpenWeather refreshes its data roughly every 10 minutes; don't re-request more often. */
export const CACHE_TTL_MS = 10 * 60 * 1000;

export interface WeatherState {
    data: WeatherBundle | null;
    error: WeatherApiError | null;
    isLoading: boolean;
}

const cache = new Map<string, WeatherBundle>();
/** Maps a normalised free-text query to the place id it resolved to. */
const queryIndex = new Map<string, string>();

export function clearWeatherCache() {
    cache.clear();
    queryIndex.clear();
}

function cacheKeyFor(target: WeatherTarget): string | undefined {
    return target.kind === 'place' ? target.place.id : queryIndex.get(target.query.trim().toLowerCase());
}

function targetKey(target: WeatherTarget): string {
    return target.kind === 'place' ? `p:${target.place.id}` : `q:${target.query.trim().toLowerCase()}`;
}

/**
 * Loads weather for a target with:
 *  - request cancellation: a new load aborts the previous one,
 *  - stale-response protection: only the latest request may update state,
 *  - duplicate suppression: re-requesting what is already in flight is a no-op,
 *  - a short in-memory cache (bypassed by `force`, used by Refresh),
 *  - previous data kept on screen while a new location loads or if it fails.
 */
export function useWeather() {
    const [state, setState] = useState<WeatherState>({ data: null, error: null, isLoading: false });
    const controllerRef = useRef<AbortController | null>(null);
    const inFlightRef = useRef<string | null>(null);
    const seqRef = useRef(0);

    const load = useCallback(
        async (target: WeatherTarget, opts: { force?: boolean } = {}): Promise<WeatherBundle | null> => {
            const key = targetKey(target);
            if (inFlightRef.current === key && !opts.force) return null;

            const cachedId = cacheKeyFor(target);
            const cached = cachedId ? cache.get(cachedId) : undefined;
            if (!opts.force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
                controllerRef.current?.abort();
                inFlightRef.current = null;
                seqRef.current += 1;
                // Prefer the caller's place (e.g. a nicer geocoded name) over the cached one.
                const data = target.kind === 'place' ? { ...cached, place: target.place } : cached;
                setState({ data, error: null, isLoading: false });
                return data;
            }

            controllerRef.current?.abort();
            const controller = new AbortController();
            controllerRef.current = controller;
            inFlightRef.current = key;
            const seq = ++seqRef.current;
            setState(s => ({ ...s, error: null, isLoading: true }));

            try {
                const data = await fetchWeatherBundle(target, controller.signal);
                if (seq !== seqRef.current) return null;
                cache.set(data.place.id, data);
                if (target.kind === 'query') queryIndex.set(target.query.trim().toLowerCase(), data.place.id);
                setState({ data, error: null, isLoading: false });
                return data;
            } catch (e) {
                if (isAbortError(e) || seq !== seqRef.current) return null;
                const error = e instanceof WeatherApiError ? e : new WeatherApiError('unknown');
                setState(s => ({ ...s, error, isLoading: false }));
                return null;
            } finally {
                if (seq === seqRef.current) inFlightRef.current = null;
            }
        },
        []
    );

    const dismissError = useCallback(() => setState(s => ({ ...s, error: null })), []);

    useEffect(
        () => () => {
            controllerRef.current?.abort();
            inFlightRef.current = null;
            seqRef.current += 1;
        },
        []
    );

    return { ...state, load, dismissError };
}
