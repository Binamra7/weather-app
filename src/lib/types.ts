/**
 * Normalized, app-facing weather types. Raw OpenWeather payloads are typed in
 * `src/api/openWeatherTypes.ts` and converted into these shapes in `normalize.ts`,
 * so components never touch the raw API response.
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
    /** OpenWeather condition code, e.g. 500. */
    id: number;
    /** OpenWeather group, e.g. "Rain". */
    main: string;
    /** Human readable description, e.g. "light rain". */
    description: string;
    kind: ConditionKind;
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
    /** Rain + snow volume for the 3h slot, mm. */
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
    /** OpenWeather AQI, 1 (good) – 5 (very poor). */
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
