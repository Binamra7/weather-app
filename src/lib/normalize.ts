import type { RawAirPollution, RawCurrent, RawForecast, RawGeoResult } from '../api/openWeatherTypes';
import { isWet, severity, toCondition } from './conditions';
import type { AirQuality, Condition, CurrentWeather, DailyForecast, Forecast, ForecastPoint, Place } from './types';

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function placeId(lat: number, lon: number): string {
    return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

export function placeFromGeo(g: RawGeoResult): Place {
    return {
        id: placeId(g.lat, g.lon),
        name: g.local_names?.en ?? g.name,
        country: g.country,
        state: g.state,
        lat: g.lat,
        lon: g.lon,
    };
}

export function placeFromCurrent(raw: RawCurrent): Place {
    return {
        id: placeId(raw.coord.lat, raw.coord.lon),
        name: raw.name,
        country: raw.sys.country,
        lat: raw.coord.lat,
        lon: raw.coord.lon,
    };
}

export function normalizeCurrent(raw: RawCurrent): CurrentWeather {
    const sunrise = num(raw.sys.sunrise);
    const sunset = num(raw.sys.sunset);
    const fallbackIsDay = sunrise != null && sunset != null ? raw.dt >= sunrise && raw.dt < sunset : true;
    return {
        dt: raw.dt,
        timezone: raw.timezone ?? 0,
        temp: raw.main.temp,
        feelsLike: raw.main.feels_like,
        humidity: raw.main.humidity,
        pressure: raw.main.pressure,
        visibility: num(raw.visibility),
        windSpeed: num(raw.wind?.speed) ?? 0,
        windDeg: num(raw.wind?.deg),
        windGust: num(raw.wind?.gust),
        clouds: num(raw.clouds?.all) ?? 0,
        rain1h: num(raw.rain?.['1h']),
        snow1h: num(raw.snow?.['1h']),
        sunrise,
        sunset,
        condition: toCondition(raw.weather[0], fallbackIsDay),
    };
}

/** YYYY-MM-DD for a unix timestamp in a location with the given UTC offset. */
export function localDateKey(dt: number, timezone: number): string {
    return new Date((dt + timezone) * 1000).toISOString().slice(0, 10);
}

/** Local hour (0–23) for a unix timestamp in a location with the given UTC offset. */
export function localHour(dt: number, timezone: number): number {
    return new Date((dt + timezone) * 1000).getUTCHours();
}

/**
 * Pick one condition to represent a whole day from its 3-hour slots.
 * Precipitation that is reasonably likely at any point in the day wins (it is what people plan
 * around); otherwise the most common daytime condition is used.
 */
function representativeCondition(points: ForecastPoint[], timezone: number): Condition {
    const daytime = points.filter(p => {
        const h = localHour(p.dt, timezone);
        return h >= 6 && h <= 18;
    });
    const pool = daytime.length ? daytime : points;

    // Check the whole day (not just daytime) so the icon agrees with the day's max precipitation chance.
    const likelyWet = points.filter(p => isWet(p.condition.kind) && p.pop >= 0.4);
    if (likelyWet.length) {
        const worst = likelyWet.reduce((a, b) => (severity[b.condition.kind] > severity[a.condition.kind] ? b : a));
        return { ...worst.condition, isDay: true };
    }

    const counts = new Map<string, { n: number; c: Condition }>();
    for (const p of pool) {
        const entry = counts.get(p.condition.kind) ?? { n: 0, c: p.condition };
        entry.n += 1;
        counts.set(p.condition.kind, entry);
    }
    let best: { n: number; c: Condition } | undefined;
    for (const entry of counts.values()) {
        if (!best || entry.n > best.n || (entry.n === best.n && severity[entry.c.kind] > severity[best.c.kind])) {
            best = entry;
        }
    }
    // pool is never empty: callers only create days that have at least one slot.
    return { ...best!.c, isDay: true };
}

export function aggregateDaily(points: ForecastPoint[], timezone: number): DailyForecast[] {
    const byDay = new Map<string, ForecastPoint[]>();
    for (const p of points) {
        const key = localDateKey(p.dt, timezone);
        const list = byDay.get(key);
        if (list) list.push(p);
        else byDay.set(key, [p]);
    }

    const days: DailyForecast[] = [];
    for (const [date, slots] of byDay) {
        days.push({
            date,
            dt: slots[0]!.dt,
            min: Math.min(...slots.map(s => s.temp)),
            max: Math.max(...slots.map(s => s.temp)),
            pop: Math.max(...slots.map(s => s.pop)),
            precip: slots.reduce((sum, s) => sum + s.precip, 0),
            condition: representativeCondition(slots, timezone),
        });
    }
    return days;
}

export function normalizeForecast(raw: RawForecast): Forecast {
    const timezone = raw.city?.timezone ?? 0;
    const points: ForecastPoint[] = raw.list.map(item => ({
        dt: item.dt,
        temp: item.main.temp,
        feelsLike: item.main.feels_like,
        humidity: item.main.humidity,
        windSpeed: num(item.wind?.speed) ?? 0,
        pop: Math.min(1, Math.max(0, num(item.pop) ?? 0)),
        precip: (num(item.rain?.['3h']) ?? 0) + (num(item.snow?.['3h']) ?? 0),
        condition: toCondition(item.weather[0], item.sys?.pod !== 'n'),
    }));
    return { timezone, points, daily: aggregateDaily(points, timezone) };
}

export function normalizeAir(raw: RawAirPollution): AirQuality | null {
    const entry = raw.list?.[0];
    if (!entry) return null;
    const aqi = entry.main.aqi;
    if (![1, 2, 3, 4, 5].includes(aqi)) return null;
    return {
        aqi: aqi as AirQuality['aqi'],
        pm2_5: num(entry.components.pm2_5),
        pm10: num(entry.components.pm10),
        o3: num(entry.components.o3),
        no2: num(entry.components.no2),
    };
}

/**
 * Today's high/low. The 2.5 current-weather `temp_min/temp_max` fields describe spread across
 * stations in a city *right now*, not the day's range, so we use the current reading plus the
 * forecast slots remaining in the local day instead.
 */
export function todayRange(current: CurrentWeather, forecast: Forecast | null): { min: number; max: number } | null {
    if (!forecast) return null;
    const today = localDateKey(current.dt, current.timezone);
    const temps = forecast.points.filter(p => localDateKey(p.dt, forecast.timezone) === today).map(p => p.temp);
    temps.push(current.temp);
    return { min: Math.min(...temps), max: Math.max(...temps) };
}
