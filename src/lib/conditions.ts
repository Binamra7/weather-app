import type { Condition, ConditionKind } from './types';
import type { RawCondition } from '../api/openWeatherTypes';

/**
 * Maps OpenWeather condition codes to the visual categories the UI renders.
 * https://openweathermap.org/weather-conditions
 */
export function kindFromCode(id: number): ConditionKind {
    if (id >= 200 && id < 300) return 'thunderstorm';
    if (id >= 300 && id < 400) return 'drizzle';
    if (id === 511) return 'sleet'; // freezing rain
    if (id >= 500 && id < 600) return 'rain';
    if (id >= 611 && id <= 616) return 'sleet';
    if (id >= 600 && id < 700) return 'snow';
    if (id === 701 || id === 741) return 'fog';
    if (id === 711 || id === 721) return 'haze';
    if (id === 731 || id === 751 || id === 761 || id === 762) return 'dust';
    if (id === 771) return 'wind';
    if (id === 781) return 'thunderstorm'; // tornado
    if (id === 800) return 'clear';
    if (id === 801 || id === 802) return 'partly-cloudy';
    if (id === 803) return 'cloudy';
    if (id === 804) return 'overcast';
    return 'cloudy';
}

export function toCondition(raw: RawCondition | undefined, fallbackIsDay = true): Condition {
    if (!raw) {
        return { id: 0, main: 'Unknown', description: 'Conditions unavailable', kind: 'cloudy', isDay: fallbackIsDay };
    }
    const isDay = raw.icon ? !raw.icon.endsWith('n') : fallbackIsDay;
    return { id: raw.id, main: raw.main, description: raw.description, kind: kindFromCode(raw.id), isDay };
}

export function isWet(kind: ConditionKind): boolean {
    return kind === 'rain' || kind === 'drizzle' || kind === 'thunderstorm' || kind === 'snow' || kind === 'sleet';
}

/** Higher = more significant to a person planning their day. */
export const severity: Record<ConditionKind, number> = {
    clear: 0,
    'partly-cloudy': 1,
    cloudy: 2,
    overcast: 3,
    haze: 3,
    fog: 4,
    dust: 4,
    wind: 4,
    drizzle: 5,
    rain: 6,
    sleet: 7,
    snow: 7,
    thunderstorm: 8,
};

/** Background theme for the atmospheric backdrop. */
export type SkyTheme =
    | 'clear-day'
    | 'clear-night'
    | 'cloudy-day'
    | 'cloudy-night'
    | 'rain-day'
    | 'rain-night'
    | 'storm'
    | 'snow-day'
    | 'snow-night'
    | 'mist-day'
    | 'mist-night';

export function skyTheme(c: Pick<Condition, 'kind' | 'isDay'>): SkyTheme {
    const tod = c.isDay ? 'day' : 'night';
    switch (c.kind) {
        case 'clear':
        case 'partly-cloudy':
            return `clear-${tod}`;
        case 'cloudy':
        case 'overcast':
        case 'wind':
            return `cloudy-${tod}`;
        case 'drizzle':
        case 'rain':
            return `rain-${tod}`;
        case 'thunderstorm':
            return 'storm';
        case 'snow':
        case 'sleet':
            return `snow-${tod}`;
        case 'fog':
        case 'haze':
        case 'dust':
            return `mist-${tod}`;
    }
}
