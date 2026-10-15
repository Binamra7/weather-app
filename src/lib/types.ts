/**
 * Normalized, app-facing weather types. Each provider types its raw payloads in `src/api/`
 * and converts them into these shapes (`normalize.ts` for OpenWeather, `normalizeOpenMeteo.ts`
 * for Open-Meteo), so components never touch a raw API response or know which provider is active.
 *
 * All temperatures are stored in °C, speeds in m/s, distances in metres and
 * precipitation in mm. Unit conversion happens only at display time (format.ts).
 */

export type Units = 'metric' | 'imperial';
export type TimeFormat = '12h' | '24h';

export interface Place {
    /** Stable id derived from rounded coordinates. */
    id: string;
    name: string;
    country?: string;
    state?: string;
    lat: number;
    lon: number;
}

export type ConditionKind =
    | 'clear'
    | 'partly-cloudy'
    | 'cloudy'
    | 'overcast'
    | 'drizzle'
    | 'rain'
    | 'thunderstorm'
    | 'snow'
    | 'sleet'
    | 'fog'
    | 'haze'
    | 'dust'
    | 'wind';

export interface Condition {
    /** Provider-specific condition code (OpenWeather 500, WMO 61, …). Only meaningful to its provider. */
    id: number;
    /** Group, e.g. "Rain". */
    main: string;
    /** Human readable description, e.g. "light rain". */
    description: string;
    kind: ConditionKind;
    /** Light precipitation draws a sparser backdrop. */
    intensity: 'light' | 'normal';
    isDay: boolean;
}

export interface CurrentWeather {
    dt: number;
    /** Shift in seconds from UTC for the location. */
    timezone: number;
    temp: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    visibility: number | null;
    windSpeed: number;
    windDeg: number | null;
    windGust: number | null;
    clouds: number;
    rain1h: number | null;
    snow1h: number | null;
    sunrise: number | null;
    sunset: number | null;
    condition: Condition;
}

export interface ForecastPoint {
    dt: number;
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    /** Probability of precipitation, 0–1. */
    pop: number;
    /** Points are 3-hour slots. Rain + snow volume for the slot, mm. */
    precip: number;
    condition: Condition;
}

export interface DailyForecast {
    /** YYYY-MM-DD in the location's local time. */
    date: string;
    /** Representative timestamp (first slot of that local day). */
    dt: number;
    min: number;
    max: number;
    pop: number;
    precip: number;
    condition: Condition;
}

export interface Forecast {
    timezone: number;
    points: ForecastPoint[];
    daily: DailyForecast[];
}

export interface AirQuality {
    /** European-style AQI band, 1 (good) – 5 (very poor). */
    aqi: 1 | 2 | 3 | 4 | 5;
    pm2_5: number | null;
    pm10: number | null;
    o3: number | null;
    no2: number | null;
}

export interface WeatherBundle {
    place: Place;
    current: CurrentWeather;
    /** null when the forecast request failed; current conditions are still shown. */
    forecast: Forecast | null;
    /** null when air-quality data is unavailable. */
    air: AirQuality | null;
    fetchedAt: number;
}
