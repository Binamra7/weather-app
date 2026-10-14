import { isWet } from './conditions';
import { formatHour, formatTemp, formatWind } from './format';
import type { TimeFormat, Units, WeatherBundle } from './types';

export interface Insight {
    id: string;
    tone: 'info' | 'warn';
    text: string;
}

/**
 * Short, practical notes derived strictly from the fetched data. Returns at most `limit`
 * items, most useful first. Nothing here is invented: every message is backed by a field.
 */
export function deriveInsights(
    bundle: WeatherBundle,
    units: Units,
    timeFormat: TimeFormat,
    nowSec = Math.floor(Date.now() / 1000),
    limit = 3
): Insight[] {
    const { current, forecast, air } = bundle;
    const out: Insight[] = [];
    const tz = current.timezone;
    const next12 = forecast?.points.filter(p => p.dt > nowSec - 3 * 3600 && p.dt <= nowSec + 12 * 3600) ?? [];

    // Precipitation timing.
    const currentlyWet = isWet(current.condition.kind);
    const wetSlot = next12.find(p => isWet(p.condition.kind) && p.pop >= 0.5);
    if (currentlyWet) {
        const dry = next12.find(p => p.dt > nowSec && !isWet(p.condition.kind) && p.pop < 0.3);
        if (dry) {
            out.push({
                id: 'dry',
                tone: 'info',
                text: `Should ease off around ${formatHour(dry.dt, tz, timeFormat)}.`,
            });
        } else if (next12.length) {
            out.push({
                id: 'wet-all',
                tone: 'warn',
                text: 'Wet conditions look set to continue for the next 12 hours.',
            });
        }
    } else if (wetSlot) {
        const what =
            wetSlot.condition.kind === 'snow' ? 'Snow' : wetSlot.condition.kind === 'thunderstorm' ? 'Storms' : 'Rain';
        out.push({
            id: 'wet-soon',
            tone: 'warn',
            text: `${what} likely around ${formatHour(wetSlot.dt, tz, timeFormat)} (${Math.round(wetSlot.pop * 100)}% chance).`,
        });
    } else if (next12.length >= 3 && next12.every(p => p.pop < 0.2)) {
        out.push({ id: 'dry-day', tone: 'info', text: 'No rain expected over the next 12 hours.' });
    }

    // Wind.
    const gust = current.windGust ?? current.windSpeed;
    if (gust >= 13.9) {
        const w = formatWind(gust, units);
        out.push({ id: 'gusts', tone: 'warn', text: `Strong gusts up to ${w.value} ${w.unit}.` });
    }

    // Feels-like gap.
    const gap = current.feelsLike - current.temp;
    if (Math.abs(gap) >= 3) {
        out.push({
            id: 'feels',
            tone: 'info',
            text: `Feels ${gap < 0 ? 'colder' : 'warmer'} than it is — ${formatTemp(current.feelsLike, units)} with ${
                gap < 0 ? 'wind chill' : 'humidity'
            }.`,
        });
    }

    // Air quality.
    if (air && air.aqi >= 4) {
        out.push({ id: 'air', tone: 'warn', text: 'Air quality is poor — consider limiting time outdoors.' });
    }

    // Visibility.
    if (current.visibility != null && current.visibility < 1000) {
        out.push({ id: 'vis', tone: 'warn', text: 'Low visibility — take extra care if driving.' });
    }

    // Tomorrow's trend.
    const days = forecast?.daily ?? [];
    if (days.length >= 2) {
        const delta = days[1]!.max - days[0]!.max;
        if (Math.abs(delta) >= 4) {
            out.push({
                id: 'trend',
                tone: 'info',
                text: `Tomorrow peaks ${Math.round(Math.abs(units === 'imperial' ? (delta * 9) / 5 : delta))}° ${
                    delta > 0 ? 'warmer' : 'cooler'
                } at ${formatTemp(days[1]!.max, units)}.`,
            });
        }
    }

    // Sunset soon.
    if (current.sunset && current.sunset > nowSec && current.sunset - nowSec <= 90 * 60) {
        out.push({ id: 'sunset', tone: 'info', text: `Sunset at ${formatHour(current.sunset, tz, timeFormat)}.` });
    }

    return out.slice(0, limit);
}
