import type { Condition, ConditionKind } from './types';
import type { RawCondition } from '../api/openWeatherTypes';

/**
 * Maps provider condition codes to the visual categories the UI renders. OpenWeather codes:
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

function unknownCondition(isDay: boolean): Condition {
    return {
        id: 0,
        main: 'Unknown',
        description: 'Conditions unavailable',
        kind: 'cloudy',
        intensity: 'normal',
        isDay,
    };
}

export function toCondition(raw: RawCondition | undefined, fallbackIsDay = true): Condition {
    if (!raw) return unknownCondition(fallbackIsDay);
    const isDay = raw.icon ? !raw.icon.endsWith('n') : fallbackIsDay;
    const light = (raw.id >= 300 && raw.id < 400) || raw.id === 500 || raw.id === 520;
    return {
        id: raw.id,
        main: raw.main,
        description: raw.description,
        kind: kindFromCode(raw.id),
        intensity: light ? 'light' : 'normal',
        isDay,
    };
}

/**
 * WMO weather interpretation codes, as used by Open-Meteo.
 * https://open-meteo.com/en/docs (section "WMO Weather interpretation codes")
 */
const WMO: Record<number, [main: string, description: string, kind: ConditionKind, light?: true]> = {
    0: ['Clear', 'clear sky', 'clear'],
    1: ['Clear', 'mainly clear', 'clear'],
    2: ['Clouds', 'partly cloudy', 'partly-cloudy'],
    3: ['Clouds', 'overcast', 'overcast'],
    45: ['Fog', 'fog', 'fog'],
    48: ['Fog', 'freezing fog', 'fog'],
    51: ['Drizzle', 'light drizzle', 'drizzle', true],
    53: ['Drizzle', 'drizzle', 'drizzle', true],
    55: ['Drizzle', 'dense drizzle', 'drizzle', true],
    56: ['Drizzle', 'light freezing drizzle', 'sleet', true],
    57: ['Drizzle', 'freezing drizzle', 'sleet', true],
    61: ['Rain', 'light rain', 'rain', true],
    63: ['Rain', 'rain', 'rain'],
    65: ['Rain', 'heavy rain', 'rain'],
    66: ['Rain', 'light freezing rain', 'sleet'],
    67: ['Rain', 'freezing rain', 'sleet'],
    71: ['Snow', 'light snow', 'snow'],
    73: ['Snow', 'snow', 'snow'],
    75: ['Snow', 'heavy snow', 'snow'],
    77: ['Snow', 'snow grains', 'snow'],
    80: ['Rain', 'light rain showers', 'rain', true],
    81: ['Rain', 'rain showers', 'rain'],
    82: ['Rain', 'violent rain showers', 'rain'],
    85: ['Snow', 'light snow showers', 'snow'],
    86: ['Snow', 'heavy snow showers', 'snow'],
    95: ['Thunderstorm', 'thunderstorm', 'thunderstorm'],
    96: ['Thunderstorm', 'thunderstorm with hail', 'thunderstorm'],
    99: ['Thunderstorm', 'thunderstorm with heavy hail', 'thunderstorm'],
};

export function conditionFromWmo(code: number | null | undefined, isDay = true): Condition {
    const entry = code == null ? undefined : WMO[code];
    if (!entry) return unknownCondition(isDay);
    const [main, description, kind, light] = entry;
    return { id: code!, main, description, kind, intensity: light ? 'light' : 'normal', isDay };
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
