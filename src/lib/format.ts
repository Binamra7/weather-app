import type { Place, TimeFormat, Units } from './types';

/** The viewer's preferred locale (explicit, so runtimes with an odd default still format sensibly). */
const LOCALE: string | undefined =
    typeof navigator !== 'undefined' ? (navigator.languages?.[0] ?? navigator.language) || undefined : undefined;

export function convertTemp(celsius: number, units: Units): number {
    return units === 'imperial' ? (celsius * 9) / 5 + 32 : celsius;
}

/** Rounded temperature with a degree sign, e.g. "18°". */
export function formatTemp(celsius: number, units: Units): string {
    const v = Math.round(convertTemp(celsius, units));
    // Avoid "-0°".
    return `${Object.is(v, -0) ? 0 : v}°`;
}

export function formatWind(ms: number, units: Units): { value: string; unit: string } {
    return units === 'imperial'
        ? { value: String(Math.round(ms * 2.23694)), unit: 'mph' }
        : { value: String(Math.round(ms * 3.6)), unit: 'km/h' };
}

export function formatVisibility(metres: number, units: Units): { value: string; unit: string } {
    if (units === 'imperial') {
        const mi = metres / 1609.344;
        return { value: mi >= 10 ? String(Math.round(mi)) : mi.toFixed(1), unit: 'mi' };
    }
    const km = metres / 1000;
    return { value: km >= 10 ? String(Math.round(km)) : km.toFixed(1), unit: 'km' };
}

export function formatPressure(hPa: number, units: Units): { value: string; unit: string } {
    return units === 'imperial'
        ? { value: (hPa * 0.02953).toFixed(2), unit: 'inHg' }
        : { value: String(Math.round(hPa)), unit: 'hPa' };
}

export function formatPrecipParts(mm: number, units: Units): { value: string; unit: string } {
    if (units === 'imperial') return { value: (mm / 25.4).toFixed(2), unit: 'in' };
    return { value: mm < 10 ? mm.toFixed(1) : String(Math.round(mm)), unit: 'mm' };
}

export function formatPrecip(mm: number, units: Units): string {
    const p = formatPrecipParts(mm, units);
    return `${p.value} ${p.unit}`;
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function compassPoint(deg: number): string {
    return COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]!;
}

/** Dew point via the Magnus formula (°C). */
export function dewPoint(tempC: number, humidity: number): number {
    const a = 17.62;
    const b = 243.12;
    const gamma = Math.log(Math.max(humidity, 1) / 100) + (a * tempC) / (b + tempC);
    return (b * gamma) / (a - gamma);
}

/**
 * OpenWeather gives a fixed UTC offset per location rather than an IANA zone, so we shift
 * the timestamp by that offset and format it as UTC. This shows the *location's* wall-clock
 * time regardless of the viewer's own timezone.
 */
function shifted(dt: number, timezone: number): Date {
    return new Date((dt + timezone) * 1000);
}

export function formatTime(dt: number, timezone: number, fmt: TimeFormat): string {
    return new Intl.DateTimeFormat(LOCALE, {
        hour: fmt === '24h' ? '2-digit' : 'numeric',
        minute: '2-digit',
        hourCycle: fmt === '24h' ? 'h23' : 'h12',
        timeZone: 'UTC',
    }).format(shifted(dt, timezone));
}

export function formatHour(dt: number, timezone: number, fmt: TimeFormat): string {
    return new Intl.DateTimeFormat(LOCALE, {
        hour: fmt === '24h' ? '2-digit' : 'numeric',
        ...(fmt === '24h' ? { minute: '2-digit' } : {}),
        hourCycle: fmt === '24h' ? 'h23' : 'h12',
        timeZone: 'UTC',
    }).format(shifted(dt, timezone));
}

export function formatWeekday(dt: number, timezone: number, style: 'short' | 'long' = 'short'): string {
    return new Intl.DateTimeFormat(LOCALE, { weekday: style, timeZone: 'UTC' }).format(shifted(dt, timezone));
}

export function formatLongDate(dt: number, timezone: number): string {
    return new Intl.DateTimeFormat(LOCALE, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
    }).format(shifted(dt, timezone));
}

export function formatUtcOffset(timezone: number): string {
    const sign = timezone >= 0 ? '+' : '−';
    const abs = Math.abs(timezone);
    const h = Math.floor(abs / 3600);
    const m = Math.round((abs % 3600) / 60);
    return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function formatRelative(fromMs: number, nowMs: number): string {
    const s = Math.max(0, Math.round((nowMs - fromMs) / 1000));
    if (s < 45) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    return `${h} h ago`;
}

let regionNames: Intl.DisplayNames | null | undefined;

/** "GB" → "United Kingdom"; falls back to the code if Intl.DisplayNames is unavailable. */
export function countryName(code: string | undefined): string | undefined {
    if (!code) return undefined;
    if (regionNames === undefined) {
        try {
            regionNames = new Intl.DisplayNames(LOCALE, { type: 'region' });
        } catch {
            regionNames = null;
        }
    }
    try {
        return regionNames?.of(code.toUpperCase()) ?? code;
    } catch {
        return code;
    }
}

export function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Bagmati Province, Nepal" */
export function placeSubtitle(p: Pick<Place, 'state' | 'country'>): string {
    return [p.state, countryName(p.country)].filter(Boolean).join(', ');
}
