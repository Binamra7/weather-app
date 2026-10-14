import type { Place, TimeFormat, Units } from './types';

/**
 * localStorage helpers. Every access is guarded: storage can be disabled (private mode,
 * blocked cookies) or contain stale/corrupt data, and the app must still work without it.
 */
const PREFIX = 'skycast:';

export function readStored<T>(key: string, fallback: T, validate: (v: unknown) => v is T): T {
    try {
        const raw = window.localStorage.getItem(PREFIX + key);
        if (raw == null) return fallback;
        const parsed: unknown = JSON.parse(raw);
        return validate(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

export function writeStored(key: string, value: unknown): void {
    try {
        window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
        // Quota exceeded or storage disabled — preferences just won't persist.
    }
}

export interface Preferences {
    units: Units;
    timeFormat: TimeFormat;
}

export const defaultPreferences: Preferences = { units: 'metric', timeFormat: '12h' };

export function isPreferences(v: unknown): v is Preferences {
    if (!v || typeof v !== 'object') return false;
    const p = v as Record<string, unknown>;
    return (p.units === 'metric' || p.units === 'imperial') && (p.timeFormat === '12h' || p.timeFormat === '24h');
}

export function isPlace(v: unknown): v is Place {
    if (!v || typeof v !== 'object') return false;
    const p = v as Record<string, unknown>;
    return (
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.lat === 'number' &&
        typeof p.lon === 'number' &&
        (p.country === undefined || typeof p.country === 'string') &&
        (p.state === undefined || typeof p.state === 'string')
    );
}

export function isPlaceList(v: unknown): v is Place[] {
    return Array.isArray(v) && v.every(isPlace);
}

export function isPlaceOrNull(v: unknown): v is Place | null {
    return v === null || isPlace(v);
}
