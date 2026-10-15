import type { RawOmAirQuality, RawOmForecast, RawOmGeoResult, RawReverseGeocode } from '../api/openMeteoTypes';
import { conditionFromWmo } from './conditions';
import { aggregateDaily, localDateKey, placeId } from './normalize';
import type { AirQuality, CurrentWeather, DailyForecast, Forecast, ForecastPoint, Place } from './types';

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Hours per forecast point; the UI is laid out for 3-hour slots. */
const SLOT_HOURS = 3;

export function placeFromOmGeo(g: RawOmGeoResult): Place {
    return {
        id: placeId(g.latitude, g.longitude),
        name: g.name,
        country: g.country_code?.toUpperCase(),
        state: g.admin1,
        lat: g.latitude,
        lon: g.longitude,
    };
}

export function placeFromReverse(r: RawReverseGeocode, lat: number, lon: number): Place | null {
    const name = r.city || r.locality;
    if (!name) return null;
    return {
        id: placeId(lat, lon),
        name,
        country: r.countryCode || undefined,
        state: r.principalSubdivision || undefined,
        lat,
        lon,
    };
}

export function normalizeOmCurrent(raw: RawOmForecast): CurrentWeather {
    const c = raw.current;
    return {
        dt: c.time,
        timezone: raw.utc_offset_seconds,
        temp: c.temperature_2m,
        feelsLike: c.apparent_temperature,
        humidity: c.relative_humidity_2m,
        pressure: c.pressure_msl,
        visibility: num(c.visibility),
        windSpeed: num(c.wind_speed_10m) ?? 0,
        windDeg: num(c.wind_direction_10m),
        windGust: num(c.wind_gusts_10m),
        clouds: num(c.cloud_cover) ?? 0,
        // Open-Meteo reports precipitation over the last 15 minutes, not the last hour.
        rain1h: null,
        snow1h: null,
        sunrise: num(raw.daily?.sunrise[0]),
        sunset: num(raw.daily?.sunset[0]),
        condition: conditionFromWmo(c.weather_code, c.is_day === 1),
    };
}

/**
 * Groups hourly values into 3-hour slots starting at local midnight. Instantaneous values come
 * from the slot's first hour; precipitation is summed and its probability is the slot's maximum.
 */
function toSlots(hourly: NonNullable<RawOmForecast['hourly']>): ForecastPoint[] {
    const points: ForecastPoint[] = [];
    for (let i = 0; i < hourly.time.length; i += SLOT_HOURS) {
        const temp = num(hourly.temperature_2m[i]);
        if (temp == null) continue;
        const range = (series: Array<number | null>) =>
            series
                .slice(i, i + SLOT_HOURS)
                .map(num)
                .filter((v): v is number => v != null);
        const pops = range(hourly.precipitation_probability);
        points.push({
            dt: hourly.time[i]!,
            temp,
            feelsLike: num(hourly.apparent_temperature[i]) ?? temp,
            humidity: num(hourly.relative_humidity_2m[i]) ?? 0,
            windSpeed: num(hourly.wind_speed_10m[i]) ?? 0,
            pop: pops.length ? Math.min(1, Math.max(...pops) / 100) : 0,
            precip: range(hourly.precipitation).reduce((sum, v) => sum + v, 0),
            condition: conditionFromWmo(num(hourly.weather_code[i]), hourly.is_day[i] !== 0),
        });
    }
    return points;
}

export function normalizeOmForecast(raw: RawOmForecast): Forecast | null {
    if (!raw.hourly?.time.length) return null;
    const timezone = raw.utc_offset_seconds;
    const points = toSlots(raw.hourly);
    // Open-Meteo's daily weather code is the day's *most severe* hour, so one drizzly hour turns a
    // sunny day into "drizzle". Pick the day's condition from the slots instead, with the same
    // rules the OpenWeather forecast uses, and take the totals from the daily block.
    const fromSlots = new Map(aggregateDaily(points, timezone).map(d => [d.date, d]));
    const d = raw.daily;
    const daily: DailyForecast[] = [];
    for (let i = 0; d && i < d.time.length; i++) {
        const date = localDateKey(d.time[i]!, timezone);
        const slots = fromSlots.get(date);
        const max = num(d.temperature_2m_max[i]) ?? slots?.max;
        const min = num(d.temperature_2m_min[i]) ?? slots?.min;
        if (!slots || max == null || min == null) continue;
        const pop = num(d.precipitation_probability_max[i]);
        daily.push({
            date,
            dt: d.time[i]!,
            min,
            max,
            pop: pop != null ? pop / 100 : slots.pop,
            precip: num(d.precipitation_sum[i]) ?? slots.precip,
            condition: slots.condition,
        });
    }
    return { timezone, points, daily: daily.length ? daily : [...fromSlots.values()] };
}

/** European AQI (0–100+) → the five bands the UI shows. */
export function aqiBand(europeanAqi: number): AirQuality['aqi'] {
    if (europeanAqi <= 20) return 1;
    if (europeanAqi <= 40) return 2;
    if (europeanAqi <= 60) return 3;
    if (europeanAqi <= 80) return 4;
    return 5;
}

export function normalizeOmAir(raw: RawOmAirQuality): AirQuality | null {
    const c = raw.current;
    const aqi = num(c?.european_aqi);
    if (!c || aqi == null) return null;
    return {
        aqi: aqiBand(aqi),
        pm2_5: num(c.pm2_5),
        pm10: num(c.pm10),
        o3: num(c.ozone),
        no2: num(c.nitrogen_dioxide),
    };
}
