/**
 * Raw response shapes for the OpenWeather endpoints this app uses. All of them
 * are available on the free plan:
 *
 *   GET /data/2.5/weather         current conditions
 *   GET /data/2.5/forecast        5 day / 3 hour forecast (40 slots)
 *   GET /data/2.5/air_pollution   current air quality
 *   GET /geo/1.0/direct           city name → coordinates (search suggestions)
 *   GET /geo/1.0/reverse          coordinates → city name (current location)
 *
 * One Call 3.0 (UV index, true hourly/daily data) needs a separate "One Call by Call"
 * subscription and is intentionally not used.
 *
 * Optional fields reflect what OpenWeather omits in practice (e.g. `rain`, `gust`).
 */

export interface RawCondition {
    id: number;
    main: string;
    description: string;
    icon: string;
}

export interface RawCurrent {
    coord: { lon: number; lat: number };
    weather: RawCondition[];
    main: {
        temp: number;
        feels_like: number;
        temp_min: number;
        temp_max: number;
        pressure: number;
        humidity: number;
    };
    visibility?: number;
    wind?: { speed?: number; deg?: number; gust?: number };
    clouds?: { all?: number };
    rain?: { '1h'?: number };
    snow?: { '1h'?: number };
    dt: number;
    sys: { country?: string; sunrise?: number; sunset?: number };
    timezone: number;
    id: number;
    name: string;
    cod: number | string;
}

export interface RawForecastItem {
    dt: number;
    main: {
        temp: number;
        feels_like: number;
        temp_min: number;
        temp_max: number;
        humidity: number;
    };
    weather: RawCondition[];
    clouds?: { all?: number };
    wind?: { speed?: number; deg?: number; gust?: number };
    visibility?: number;
    pop?: number;
    rain?: { '3h'?: number };
    snow?: { '3h'?: number };
    sys?: { pod?: 'd' | 'n' };
}

export interface RawForecast {
    cnt: number;
    list: RawForecastItem[];
    city: {
        name: string;
        country?: string;
        timezone: number;
        sunrise?: number;
        sunset?: number;
        coord: { lat: number; lon: number };
    };
}

export interface RawAirPollution {
    list: Array<{
        main: { aqi: number };
        components: Partial<Record<'co' | 'no' | 'no2' | 'o3' | 'so2' | 'pm2_5' | 'pm10' | 'nh3', number>>;
        dt: number;
    }>;
}

export interface RawGeoResult {
    name: string;
    local_names?: Record<string, string>;
    lat: number;
    lon: number;
    country?: string;
    state?: string;
}
