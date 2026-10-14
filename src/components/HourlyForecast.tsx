import { useElementWidth } from '../hooks/useElementWidth';
import { capitalize, convertTemp, formatHour, formatTemp, formatWeekday } from '../lib/format';
import { localDateKey } from '../lib/normalize';
import type { Condition, CurrentWeather, Forecast, TimeFormat, Units } from '../lib/types';
import { WeatherIcon } from './WeatherIcon';
import './Forecast.css';
import { rampColor } from '../lib/tempColor';

interface Props {
    current: CurrentWeather;
    forecast: Forecast;
    units: Units;
    timeFormat: TimeFormat;
    nowSec: number;
}

interface Column {
    key: string;
    dt: number;
    label: string;
    temp: number;
    /** null for the live reading: current conditions carry no probability. */
    pop: number | null;
    condition: Condition;
}

/** Monotone cubic through the points (no overshoot past real readings). */
function monotonePath(pts: Array<[number, number]>): string {
    const n = pts.length;
    if (n === 0) return '';
    const f = (v: number) => v.toFixed(1);
    if (n < 3) return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ');
    const dx: number[] = [];
    const m: number[] = [];
    for (let i = 0; i < n - 1; i++) {
        dx[i] = pts[i + 1]![0] - pts[i]![0];
        m[i] = (pts[i + 1]![1] - pts[i]![1]) / dx[i]!;
    }
    const t: number[] = [m[0]!];
    for (let i = 1; i < n - 1; i++) {
        const a = m[i - 1]!;
        const b = m[i]!;
        t[i] =
            a * b <= 0
                ? 0
                : (3 * (dx[i - 1]! + dx[i]!)) / ((2 * dx[i]! + dx[i - 1]!) / a + (dx[i]! + 2 * dx[i - 1]!) / b);
    }
    t[n - 1] = m[n - 2]!;
    let d = `M${f(pts[0]![0])} ${f(pts[0]![1])}`;
    for (let i = 0; i < n - 1; i++) {
        const [x0, y0] = pts[i]!;
        const [x1, y1] = pts[i + 1]!;
        const h = dx[i]! / 3;
        d += ` C${f(x0 + h)} ${f(y0 + t[i]! * h)} ${f(x1 - h)} ${f(y1 - t[i + 1]! * h)} ${f(x1)} ${f(y1)}`;
    }
    return d;
}

const MIN_COL = 60;
// Vertical layout of the stacked panels (px).
const TEMP_TOP = 28; // room for the value labels above the highest point
const TEMP_H = 60;
const PRECIP_TOP = 104;
const BAR_MAX = 30;
const BASELINE = PRECIP_TOP + 16 + BAR_MAX;
const GLYPH_TOP = BASELINE + 10;
const GLYPH = 24;
const TIME_Y = GLYPH_TOP + GLYPH + 22;
const DAY_Y = TIME_Y + 19;
const HEIGHT = DAY_Y + 10;

/**
 * Meteogram for the next 36 hours: temperature curve, precipitation chance, condition changes
 * and time on one shared axis. Free-plan forecasts come in 3-hour steps, so it says so rather
 * than pretending to be hourly. The first column is the live current reading.
 */
export function HourlyForecast({ current, forecast, units, timeFormat, nowSec }: Props) {
    const [scrollerRef, measured] = useElementWidth<HTMLDivElement>();
    const tz = forecast.timezone;

    const cols: Column[] = [
        {
            key: 'now',
            dt: current.dt,
            label: 'Now',
            temp: current.temp,
            pop: null,
            condition: current.condition,
        },
        ...forecast.points
            .filter(p => p.dt > nowSec)
            .slice(0, 12)
            .map(p => ({
                key: String(p.dt),
                dt: p.dt,
                label: formatHour(p.dt, tz, timeFormat),
                temp: p.temp,
                pop: p.pop,
                condition: p.condition,
            })),
    ];

    const n = cols.length;
    const minWidth = n * MIN_COL;
    const width = Math.max(measured, minWidth);
    const scrollable = measured > 0 && width > measured;
    const colW = width / n;
    const cx = (i: number) => colW * (i + 0.5);

    // Temperature scale in display units, with a minimum span so a 1° wobble stays small.
    const temps = cols.map(c => convertTemp(c.temp, units));
    const rawLo = Math.min(...temps);
    const rawHi = Math.max(...temps);
    const minSpan = units === 'imperial' ? 10 : 6;
    const pad = Math.max(0, minSpan - (rawHi - rawLo)) / 2;
    const lo = rawLo - pad;
    const span = rawHi + pad - lo || 1;
    const ty = (t: number) => TEMP_TOP + (1 - (t - lo) / span) * TEMP_H;
    const pts = temps.map((t, i) => [cx(i), ty(t)] as [number, number]);
    const maxI = temps.indexOf(rawHi);
    const minI = temps.indexOf(rawLo);
    const labelEvery = colW >= 48 ? 1 : 2;

    const isNight = cols.map(c => !c.condition.isDay);
    // Merge consecutive night columns into single bands so no seams show.
    const bands: Array<[number, number]> = [];
    isNight.forEach((night, i) => {
        if (!night) return;
        const last = bands[bands.length - 1];
        if (last && last[1] === i) last[1] = i + 1;
        else bands.push([i, i + 1]);
    });

    const dayKeys = cols.map(c => localDateKey(c.dt, tz));
    const newDay = dayKeys.map((k, i) => i > 0 && k !== dayKeys[i - 1]);
    const maxPop = Math.max(0, ...cols.map(c => c.pop ?? 0));
    const barW = Math.min(colW * 0.42, 20);

    return (
        <section className="section hourly" aria-labelledby="hourly-title">
            <h2 id="hourly-title" className="section__title">
                Next 36 hours <span className="section__note">3-hour steps</span>
            </h2>
            <div
                ref={scrollerRef}
                className="hourly__scroller"
                tabIndex={scrollable ? 0 : undefined}
                role={scrollable ? 'region' : undefined}
                aria-label={scrollable ? 'Forecast by time, scrollable' : undefined}
            >
                <svg
                    className="mg"
                    width={width}
                    height={HEIGHT}
                    viewBox={`0 0 ${width} ${HEIGHT}`}
                    aria-hidden="true"
                    focusable="false"
                >
                    {bands.map(([a, b]) => (
                        <rect key={a} className="mg__night" x={a * colW} y={0} width={(b - a) * colW} height={HEIGHT} />
                    ))}
                    {newDay.map(
                        (d, i) =>
                            d && (
                                <line key={i} className="mg__day-rule" x1={i * colW} x2={i * colW} y1={0} y2={HEIGHT} />
                            )
                    )}

                    {/* Now marker */}
                    <line className="mg__now" x1={cx(0)} x2={cx(0)} y1={TEMP_TOP - 4} y2={BASELINE} />

                    {/* a) Temperature */}
                    <path className="mg__line" d={monotonePath(pts)} />
                    {pts.map(([x, y], i) => (
                        <circle
                            key={i}
                            className="mg__dot"
                            cx={x}
                            cy={y}
                            r={3.5}
                            style={{ fill: rampColor(cols[i]!.temp) }}
                        />
                    ))}
                    {pts.map(([x, y], i) => {
                        const extreme = i === maxI || i === minI;
                        if (!extreme && i % labelEvery !== 0) return null;
                        return (
                            <text
                                key={i}
                                className={`mg__temp${extreme ? ' is-extreme' : ''}${isNight[i] ? ' is-night' : ''}`}
                                x={x}
                                y={y - 9}
                                textAnchor="middle"
                            >
                                {formatTemp(cols[i]!.temp, units)}
                            </text>
                        );
                    })}

                    {/* b) Precipitation probability */}
                    <line className="mg__baseline" x1={0} x2={width} y1={BASELINE + 0.5} y2={BASELINE + 0.5} />
                    {cols.map((c, i) => {
                        if (c.pop == null || c.pop < 0.05) return null;
                        const h = Math.max(1, c.pop * BAR_MAX);
                        return (
                            <g key={c.key}>
                                <rect
                                    className="mg__bar"
                                    x={cx(i) - barW / 2}
                                    y={BASELINE - h}
                                    width={barW}
                                    height={h}
                                />
                                {c.pop >= 0.2 && (
                                    <text className="mg__pop" x={cx(i)} y={BASELINE - h - 4} textAnchor="middle">
                                        {Math.round(c.pop * 100)}%
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    {maxPop < 0.1 && (
                        <text className="mg__quiet" x={cx(1) - colW / 2 + 4} y={BASELINE - 8}>
                            Precipitation unlikely
                        </text>
                    )}

                    {/* c) Condition glyphs, only where the condition changes */}
                    {cols.map((c, i) => {
                        const prev = cols[i - 1];
                        if (
                            prev &&
                            prev.condition.kind === c.condition.kind &&
                            prev.condition.isDay === c.condition.isDay
                        )
                            return null;
                        return (
                            <g
                                key={c.key}
                                className="mg__glyph"
                                transform={`translate(${cx(i) - GLYPH / 2} ${GLYPH_TOP})`}
                            >
                                <WeatherIcon
                                    kind={c.condition.kind}
                                    isDay={c.condition.isDay}
                                    size={GLYPH}
                                    animated={false}
                                />
                            </g>
                        );
                    })}

                    {/* d) Time */}
                    {cols.map((c, i) => (
                        <text
                            key={c.key}
                            className={`mg__time${i === 0 ? ' is-now' : ''}`}
                            x={cx(i)}
                            y={TIME_Y}
                            textAnchor="middle"
                        >
                            {c.label}
                        </text>
                    ))}
                    {newDay.map(
                        (d, i) =>
                            d && (
                                <text key={i} className="mg__weekday" x={cx(i)} y={DAY_Y} textAnchor="middle">
                                    {formatWeekday(cols[i]!.dt, tz)}
                                </text>
                            )
                    )}
                </svg>
            </div>

            {/* Wrapped: a <table> ignores the 1px width of .visually-hidden and would widen the page. */}
            <div className="visually-hidden">
                <table>
                    <caption>Forecast for the next 36 hours in 3-hour steps</caption>
                    <thead>
                        <tr>
                            <th scope="col">Time</th>
                            <th scope="col">Temperature</th>
                            <th scope="col">Conditions</th>
                            <th scope="col">Chance of precipitation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cols.map((c, i) => (
                            <tr key={c.key}>
                                <th scope="row">
                                    {c.label}
                                    {newDay[i] ? `, ${formatWeekday(c.dt, tz, 'long')}` : ''}
                                </th>
                                <td>{formatTemp(c.temp, units)}</td>
                                <td>{capitalize(c.condition.description)}</td>
                                <td>{c.pop != null ? `${Math.round(c.pop * 100)}%` : 'Not forecast'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
