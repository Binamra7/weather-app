import type { ReactNode } from 'react';
import type { WeatherApiError } from '../api/openWeather';
import type { Place } from '../lib/types';
import { AlertIcon, CloseIcon, LocateIcon } from './Icons';
import './States.css';

/** Layout-shaped placeholder while the first result loads: sky panel, hourly lines, daily rows. */
export function DashboardSkeleton() {
    return (
        <div className="dashboard skeleton-grid" aria-busy="true" aria-label="Loading weather">
            <div className="skeleton skeleton--hero">
                <span className="sk sk--panel" />
            </div>
            <div className="skeleton skeleton--hourly">
                <span className="sk sk--title" />
                <span className="sk sk--chart" />
            </div>
            <div className="skeleton skeleton--daily">
                <span className="sk sk--title" />
                {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className="sk-row">
                        <span className="sk sk--line" />
                    </span>
                ))}
            </div>
        </div>
    );
}

const QUICK_PICKS: Array<Omit<Place, 'id'>> = [
    { name: 'Kathmandu', country: 'NP', lat: 27.7172, lon: 85.324 },
    { name: 'London', country: 'GB', lat: 51.5073, lon: -0.1276 },
    {
        name: 'New York',
        country: 'US',
        state: 'New York',
        lat: 40.7128,
        lon: -74.006,
    },
    { name: 'Tokyo', country: 'JP', lat: 35.6828, lon: 139.759 },
    {
        name: 'Sydney',
        country: 'AU',
        state: 'New South Wales',
        lat: -33.8688,
        lon: 151.2093,
    },
];

export function Welcome({
    onPick,
    onLocate,
    locating,
}: {
    onPick: (p: Omit<Place, 'id'>) => void;
    onLocate: () => void;
    locating: boolean;
}) {
    return (
        <section className="state" aria-labelledby="welcome-title">
            <h1 id="welcome-title" className="state__title">
                Check the sky, anywhere.
            </h1>
            <p className="state__text">Search for a city above, use your location, or start with one of these.</p>
            <ul className="picks" aria-label="Suggested cities">
                {QUICK_PICKS.map(p => (
                    <li key={p.name}>
                        <button type="button" className="picks__row" onClick={() => onPick(p)}>
                            <span className="picks__name">{p.name}</span>
                            <span className="picks__meta">{[p.state, p.country].filter(Boolean).join(', ')}</span>
                        </button>
                    </li>
                ))}
            </ul>
            <div className="state__actions">
                <button type="button" className="btn btn--quiet" onClick={onLocate} disabled={locating}>
                    <LocateIcon className={locating ? 'spin' : undefined} />
                    {locating ? 'Finding you…' : 'Use my location'}
                </button>
            </div>
        </section>
    );
}

export function SetupRequired() {
    return (
        <section className="state" aria-labelledby="setup-title">
            <h1 id="setup-title" className="state__title state__title--small">
                Add your OpenWeather API key
            </h1>
            <p className="state__text">
                Create a free key at <a href="https://home.openweathermap.org/api_keys">openweathermap.org</a>, then add
                it to a <code>.env.local</code> file in the project root and restart the dev server:
            </p>
            <pre className="state__code">
                <code>VITE_OPENWEATHER_API_KEY=your_key_here</code>
            </pre>
            <p className="state__text state__text--small">
                The key is bundled into the browser build, so treat it as public. New keys can take up to a couple of
                hours to activate.
            </p>
        </section>
    );
}

export function ErrorState({
    error,
    onRetry,
    children,
}: {
    error: WeatherApiError;
    onRetry?: () => void;
    children?: ReactNode;
}) {
    return (
        <section className="state" role="alert" aria-labelledby="error-title">
            <h1 id="error-title" className="state__title state__title--small">
                {error.kind === 'not-found' ? 'Place not found' : 'Weather unavailable'}
            </h1>
            <p className="state__text">{error.message}</p>
            <div className="state__actions">
                {onRetry && error.kind !== 'not-found' && error.kind !== 'invalid-key' && (
                    <button type="button" className="btn btn--primary" onClick={onRetry}>
                        Try again
                    </button>
                )}
                {children}
            </div>
        </section>
    );
}

/** Inline, dismissible message shown above existing data (e.g. a failed second search). */
export function Banner({
    message,
    onDismiss,
    onRetry,
}: {
    message: string;
    onDismiss: () => void;
    onRetry?: () => void;
}) {
    return (
        <div className="banner" role="alert">
            <AlertIcon className="banner__icon" />
            <p className="banner__text">{message}</p>
            {onRetry && (
                <button type="button" className="link-btn banner__action" onClick={onRetry}>
                    Retry
                </button>
            )}
            <button type="button" className="banner__close" onClick={onDismiss} aria-label="Dismiss message">
                <CloseIcon />
            </button>
        </div>
    );
}
