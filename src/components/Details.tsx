import type { ReactNode } from 'react';
import {
    compassPoint,
    dewPoint,
    formatDuration,
    formatPrecip,
    formatPrecipParts,
    formatPressure,
    formatTemp,
    formatTime,
    formatVisibility,
    formatWind,
} from '../lib/format';
import type { AirQuality, CurrentWeather, Forecast, TimeFormat, Units } from '../lib/types';
import './Details.css';

/* ---------- Conditions now ---------- */

function Metric({
    label,
    value,
    unit,
    note,
    glyph,
}: {
    label: string;
    value: string;
    unit?: string;
    note: ReactNode;
    glyph?: ReactNode;
}) {
    return (
        <div className="metric">
            <dt className="metric__label">{label}</dt>
            <dd className="metric__value">
                {glyph}
                <span className="metric__num">{value}</span>
                {unit && <span className="metric__unit">{unit}</span>}
            </dd>
            <dd className="metric__note">{note}</dd>
        </div>
    );
}

/** Arrow pointing the way the wind blows *to* (meteorological "from" + 180°). */
function WindArrow({ deg }: { deg: number }) {
    return (
        <svg className="metric__arrow" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
            <g transform={`rotate(${(deg + 180) % 360} 10 10)`}>
                <path
                    d="M10 3v14M5.5 7.5 10 3l4.5 4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </g>
        </svg>
    );
}

function humidityNote(h: number): string {
    if (h < 30) return 'Dry air';
    if (h < 60) return 'Comfortable';
    if (h < 80) return 'Humid';
    return 'Very humid';
}

function visibilityNote(m: number): string {
    if (m >= 10000) return 'Clear view';
    if (m >= 5000) return 'Good';
    if (m >= 1000) return 'Reduced';
    return 'Poor';
}

function pressureNote(hPa: number): string {
    if (hPa < 1000) return 'Low, unsettled';
    if (hPa > 1022) return 'High, settled';
    return 'Normal';
}

function feelsNote(c: CurrentWeather): string {
    const d = c.feelsLike - c.temp;
    if (Math.abs(d) < 1.5) return 'Close to the actual temperature';
    return d < 0 ? 'Wind makes it feel colder' : 'Humidity makes it feel warmer';
}

export function MetricsGrid({
    current,
    forecast,
    units,
    nowSec,
}: {
    current: CurrentWeather;
    forecast: Forecast | null;
    units: Units;
    nowSec: number;
}) {
    const wind = formatWind(current.windSpeed, units);
    const gust = current.windGust != null ? formatWind(current.windGust, units) : null;
    const vis = current.visibility != null ? formatVisibility(current.visibility, units) : null;
    const pressure = formatPressure(current.pressure, units);
    const dew = dewPoint(current.temp, current.humidity);

    const next24 = forecast?.points.filter(p => p.dt > nowSec && p.dt <= nowSec + 24 * 3600) ?? [];
    const precip24 = next24.reduce((s, p) => s + p.precip, 0);
    const pop24 = next24.length ? Math.max(...next24.map(p => p.pop)) : null;
    const lastHour = (current.rain1h ?? 0) + (current.snow1h ?? 0);
    const precipShown = forecast
        ? formatPrecipParts(precip24, units)
        : lastHour
          ? formatPrecipParts(lastHour, units)
          : null;

    const windNote = [
        current.windDeg != null ? `From ${compassPoint(current.windDeg)}` : 'Direction not reported',
        gust ? `gusts ${gust.value} ${gust.unit}` : null,
    ]
        .filter(Boolean)
        .join(' · ');

    const precipNote = forecast
        ? [
              'Expected next 24 h',
              pop24 != null ? `up to ${Math.round(pop24 * 100)}%` : null,
              lastHour ? `${formatPrecip(lastHour, units)} last hour` : null,
          ]
              .filter(Boolean)
              .join(' · ')
        : lastHour
          ? 'In the last hour'
          : 'Forecast unavailable';

    return (
        <section className="section metrics" aria-labelledby="metrics-title">
            <h2 id="metrics-title" className="section__title">
                Conditions now
            </h2>
            <dl className="metrics__list tabular">
                <Metric
                    label="Wind"
                    value={wind.value}
                    unit={wind.unit}
                    note={windNote}
                    glyph={current.windDeg != null ? <WindArrow deg={current.windDeg} /> : undefined}
                />
                <Metric
                    label="Humidity"
                    value={String(current.humidity)}
                    unit="%"
                    note={`${humidityNote(current.humidity)} · dew point ${formatTemp(dew, units)}`}
                />
                <Metric
                    label="Precipitation"
                    value={precipShown ? precipShown.value : '—'}
                    unit={precipShown?.unit}
                    note={precipNote}
                />
                <Metric label="Feels like" value={formatTemp(current.feelsLike, units)} note={feelsNote(current)} />
                <Metric
                    label="Visibility"
                    value={vis ? vis.value : '—'}
                    unit={vis?.unit}
                    note={current.visibility != null ? visibilityNote(current.visibility) : 'Not reported'}
                />
                <Metric
                    label="Pressure"
                    value={pressure.value}
                    unit={pressure.unit}
                    note={pressureNote(current.pressure)}
                />
                <Metric
                    label="Cloud cover"
                    value={String(current.clouds)}
                    unit="%"
                    note={
                        current.clouds < 20 ? 'Mostly clear' : current.clouds < 70 ? 'Partly cloudy' : 'Mostly cloudy'
                    }
                />
            </dl>
        </section>
    );
}

/* ---------- Daylight ---------- */

const DAY = 86400;
/** Seconds since local midnight at the location (fixed UTC offset). */
const secondsOfDay = (t: number, tz: number) => (((t + tz) % DAY) + DAY) % DAY;
const pct = (s: number) => `${((s / DAY) * 100).toFixed(2)}%`;

export function SunCard({
    current,
    timeFormat,
    nowSec,
}: {
    current: CurrentWeather;
    timeFormat: TimeFormat;
    nowSec: number;
}) {
    const { sunrise, sunset, timezone } = current;
    if (sunrise == null || sunset == null) {
        return (
            <section className="section sun" aria-labelledby="sun-title">
                <h2 id="sun-title" className="section__title">
                    Daylight
                </h2>
                <p className="sun__status">Sunrise and sunset aren’t available here (e.g. polar day or night).</p>
            </section>
        );
    }

    const dayLen = sunset - sunrise;
    const rise = secondsOfDay(sunrise, timezone);
    const set = secondsOfDay(sunset, timezone);
    const now = secondsOfDay(nowSec, timezone);
    // Daylight normally sits inside one local day; split it if it wraps past midnight.
    const segments: Array<[number, number]> =
        set >= rise
            ? [[rise, set]]
            : [
                  [0, set],
                  [rise, DAY],
              ];

    const riseText = formatTime(sunrise, timezone, timeFormat);
    const setText = formatTime(sunset, timezone, timeFormat);
    const status =
        nowSec < sunrise
            ? `sunrise in ${formatDuration(sunrise - nowSec)}`
            : nowSec <= sunset
              ? `${formatDuration(sunset - nowSec)} left`
              : 'the sun has set';

    return (
        <section className="section sun" aria-labelledby="sun-title">
            <h2 id="sun-title" className="section__title">
                Daylight
            </h2>
            <div
                className="sun__chart"
                role="img"
                aria-label={`Sunrise ${riseText}, sunset ${setText}; ${formatDuration(dayLen)} of daylight, ${status}.`}
            >
                <span
                    className="sun__now-label"
                    style={{ left: `clamp(1rem, ${pct(now)}, calc(100% - 1rem))` }}
                    aria-hidden="true"
                >
                    Now
                </span>
                <span className="sun__track">
                    {segments.map(([a, b]) => (
                        <span key={a} className="sun__day" style={{ left: pct(a), width: pct(b - a) }} />
                    ))}
                    <span className="sun__now" style={{ left: pct(now) }} />
                </span>
                <span className="sun__axis" aria-hidden="true">
                    <span>Midnight</span>
                    <span>Noon</span>
                    <span>Midnight</span>
                </span>
            </div>
            <dl className="sun__times tabular">
                <div>
                    <dt>Sunrise</dt>
                    <dd>{riseText}</dd>
                </div>
                <div>
                    <dt>Sunset</dt>
                    <dd>{setText}</dd>
                </div>
            </dl>
            <p className="sun__status tabular">
                {formatDuration(dayLen)} of daylight · {status}
            </p>
        </section>
    );
}

/* ---------- Air quality ---------- */

const AQI = {
    1: { label: 'Good', note: 'Air quality is satisfactory.', color: 'var(--t-10)' },
    2: { label: 'Fair', note: 'Acceptable for most people.', color: 'var(--t-18)' },
    3: { label: 'Moderate', note: 'Sensitive groups may feel effects.', color: 'var(--t-25)' },
    4: { label: 'Poor', note: 'Limit prolonged outdoor exertion.', color: 'var(--t-32)' },
    5: { label: 'Very poor', note: 'Avoid outdoor activity if possible.', color: 'var(--t-38)' },
} as const;

export function AirQualityCard({ air }: { air: AirQuality | null }) {
    return (
        <section className="section air" aria-labelledby="air-title">
            <h2 id="air-title" className="section__title">
                Air quality
            </h2>
            {air ? (
                <>
                    <div className="air__head">
                        <p className="air__label">{AQI[air.aqi].label}</p>
                        <p className="air__index tabular">AQI {air.aqi} of 5</p>
                    </div>
                    <div className="air__scale" aria-hidden="true">
                        {([1, 2, 3, 4, 5] as const).map(n => (
                            <span
                                key={n}
                                className={n === air.aqi ? 'is-current' : undefined}
                                style={n === air.aqi ? { background: AQI[n].color } : undefined}
                            />
                        ))}
                    </div>
                    <p className="air__note">{AQI[air.aqi].note}</p>
                    <dl className="air__components tabular">
                        {(
                            [
                                ['PM2.5', air.pm2_5],
                                ['PM10', air.pm10],
                                ['O₃', air.o3],
                                ['NO₂', air.no2],
                            ] as const
                        ).map(([k, v]) => (
                            <div key={k}>
                                <dt>{k}</dt>
                                <dd>{v != null ? Math.round(v) : '—'}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="footnote">Concentrations in µg/m³.</p>
                </>
            ) : (
                <p className="air__note">Air-quality data isn’t available for this location right now.</p>
            )}
        </section>
    );
}
