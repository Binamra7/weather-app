/**
 * Raw response shapes for the Open-Meteo endpoints this app uses. All are free for
 * non-commercial use, need no API key and allow browser (CORS) requests:
 *
 *   GET api.open-meteo.com/v1/forecast                  current + hourly + daily
 *   GET air-quality-api.open-meteo.com/v1/air-quality   current air quality
 *   GET geocoding-api.open-meteo.com/v1/search          city name → coordinates
 *
 * Open-Meteo has no reverse geocoding, so the current location's name comes from
 * BigDataCloud's free client-side endpoint (RawReverseGeocode).
 *
 * Requests use `timeformat=unixtime`, `timezone=auto` and `wind_speed_unit=ms`, so times are
 * unix seconds and the units match the normalized types. Values can be null where a model has
 * no data.
 */

type Series = Array<number | null>;

export interface RawOmCurrent {
    time: number;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    is_day: number;
    weather_code: number;
    cloud_cover: number | null;
    pressure_msl: number;
    wind_speed_10m: number | null;
    wind_direction_10m: number | null;
    wind_gusts_10m: number | null;
    visibility: number | null;
}

export interface RawOmForecast {
    latitude: number;
    longitude: number;
    utc_offset_seconds: number;
    timezone: string;
    current: RawOmCurrent;
    hourly?: {
        time: number[];
        temperature_2m: Series;
        apparent_temperature: Series;
        relative_humidity_2m: Series;
        precipitation_probability: Series;
        precipitation: Series;
        weather_code: Series;
        wind_speed_10m: Series;
        is_day: Series;
    };
    daily?: {
        time: number[];
        temperature_2m_max: Series;
        temperature_2m_min: Series;
        precipitation_sum: Series;
        precipitation_probability_max: Series;
        sunrise: Series;
        sunset: Series;
    };
}

export interface RawOmAirQuality {
    current?: {
        time: number;
        european_aqi: number | null;
        pm2_5: number | null;
        pm10: number | null;
        ozone: number | null;
        nitrogen_dioxide: number | null;
    };
}

export interface RawOmGeoResult {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    country_code?: string;
    admin1?: string;
}

/** `results` is omitted entirely when nothing matches. */
export interface RawOmGeoSearch {
    results?: RawOmGeoResult[];
}

export interface RawReverseGeocode {
    latitude: number;
    longitude: number;
    city?: string;
    locality?: string;
    principalSubdivision?: string;
    countryCode?: string;
}
