import {
    capitalize,
    formatLongDate,
    formatRelative,
    formatTemp,
    formatTime,
    formatUtcOffset,
    placeSubtitle,
} from '../lib/format';
import type { Insight } from '../lib/insights';
import type { TimeFormat, Units, WeatherBundle } from '../lib/types';
import { AlertIcon, RefreshIcon, StarIcon } from './Icons';
import { WeatherIcon } from './WeatherIcon';
import './CurrentHero.css';

interface Props {
    bundle: WeatherBundle;
    units: Units;
    timeFormat: TimeFormat;
    range: { min: number; max: number } | null;
    insights: Insight[];
    isFavorite: boolean;
    onToggleFavorite: () => void;
    onRefresh: () => void;
    isRefreshing: boolean;
    nowMs: number;
}

/**
 * The top of the poster: the temperature set as the image, with the place and the day's facts
 * in a narrow information column — Swiss-style asymmetric grid. The field colour and weather
 * marks behind it come from the page (`data-sky` tokens + Backdrop).
 */
export function CurrentHero({
    bundle,
    units,
    timeFormat,
    range,
    insights,
    isFavorite,
    onToggleFavorite,
    onRefresh,
    isRefreshing,
    nowMs,
}: Props) {
    const { place, current } = bundle;
    const { condition } = current;
    const nowSec = Math.floor(nowMs / 1000);
    const region = placeSubtitle(place);
    const description = capitalize(condition.description);
    const [headline, ...more] = insights;
    const temp = formatTemp(current.temp, units);

    return (
        <section className="poster" aria-labelledby="hero-place">
            <header className="poster__place">
                <h1 id="hero-place" className="poster__name">
                    {place.name}
                </h1>
                {region && <p className="poster__region">{region}</p>}
                <p className="poster__time tabular">
                    {formatLongDate(nowSec, current.timezone)}
                    <br />
                    {formatTime(nowSec, current.timezone, timeFormat)} local time, {formatUtcOffset(current.timezone)}
                </p>
            </header>

            <div className="poster__reading">
                <p
                    className="poster__temp tabular"
                    aria-label={`${temp} ${units === 'imperial' ? 'Fahrenheit' : 'Celsius'}`}
                >
                    {temp.replace('°', '')}
                    <span className="poster__deg" aria-hidden="true">
                        °
                    </span>
                </p>
                <p className="poster__condition">
                    <WeatherIcon
                        className="poster__icon"
                        kind={condition.kind}
                        isDay={condition.isDay}
                        label={description}
                        size={44}
                    />
                    {description}
                </p>
                {headline && <p className="poster__headline">{headline.text}</p>}
            </div>

            <div className="poster__facts">
                <dl className="facts tabular">
                    <div>
                        <dt>Feels like</dt>
                        <dd>{formatTemp(current.feelsLike, units)}</dd>
                    </div>
                    {range && (
                        <>
                            <div title="From the current reading and the rest of today's forecast">
                                <dt>High</dt>
                                <dd>{formatTemp(range.max, units)}</dd>
                            </div>
                            <div>
                                <dt>Low</dt>
                                <dd>{formatTemp(range.min, units)}</dd>
                            </div>
                        </>
                    )}
                </dl>

                {more.length > 0 && (
                    <ul className="poster__notes" aria-label="More highlights">
                        {more.map(i => (
                            <li key={i.id} className={i.tone === 'warn' ? 'poster__note is-warn' : 'poster__note'}>
                                {i.tone === 'warn' && <AlertIcon />}
                                <span>{i.text}</span>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="poster__actions">
                    <button
                        type="button"
                        className="link-btn"
                        onClick={onToggleFavorite}
                        aria-pressed={isFavorite}
                        aria-label={
                            isFavorite ? `Remove ${place.name} from favorites` : `Save ${place.name} to favorites`
                        }
                    >
                        <StarIcon filled={isFavorite} />
                        {isFavorite ? 'Saved' : 'Save'}
                    </button>
                    <button
                        type="button"
                        className="link-btn"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        aria-label="Refresh weather"
                    >
                        <RefreshIcon className={isRefreshing ? 'spin' : undefined} />
                        Refresh
                    </button>
                    <span className="poster__updated tabular" aria-live="polite">
                        {isRefreshing ? 'Updating…' : `Updated ${formatRelative(bundle.fetchedAt, nowMs)}`}
                    </span>
                </div>
            </div>
        </section>
    );
}
