import { useCallback, useEffect, useMemo, useState } from 'react';
import { getProvider, type WeatherTarget } from './api/weather';
import { Backdrop } from './components/Backdrop';
import { CurrentHero } from './components/CurrentHero';
import { DailyForecast } from './components/DailyForecast';
import { AirQualityCard, MetricsGrid, SunCard } from './components/Details';
import { HourlyForecast } from './components/HourlyForecast';
import { LocateIcon } from './components/Icons';
import { PlacesBar } from './components/PlacesBar';
import { SearchBar } from './components/SearchBar';
import { Banner, DashboardSkeleton, ErrorState, SetupRequired, Welcome } from './components/States';
import { CACHE_TTL_MS, useWeather } from './hooks/useWeather';
import { useNow } from './hooks/useNow';
import { useStoredState } from './hooks/useStoredState';
import { skyTheme, type SkyTheme } from './lib/conditions';
import { formatTemp } from './lib/format';
import { deriveInsights } from './lib/insights';
import { placeId, todayRange } from './lib/normalize';
import { defaultPreferences, isPlaceList, isPlaceOrNull, isPreferences } from './lib/storage';
import type { Place } from './lib/types';
import './App.css';

const MAX_RECENTS = 8;
const MAX_FAVORITES = 12;

function geolocationMessage(err: GeolocationPositionError): string {
    switch (err.code) {
        case err.PERMISSION_DENIED:
            return 'Location access was denied. You can still search for a city, or allow location in your browser settings.';
        case err.TIMEOUT:
            return 'Finding your location took too long. Please try again or search for a city.';
        default:
            return "Your location couldn't be determined. Please search for a city instead.";
    }
}

export default function App() {
    const [prefs, setPrefs] = useStoredState('prefs', defaultPreferences, isPreferences);
    const [favorites, setFavorites] = useStoredState<Place[]>('favorites', [], isPlaceList);
    const [recents, setRecents] = useStoredState<Place[]>('recents', [], isPlaceList);
    const [lastPlace, setLastPlace] = useStoredState<Place | null>('last-place', null, isPlaceOrNull);
    const [notice, setNotice] = useState<string | null>(null);
    const [locating, setLocating] = useState(false);
    // Restore the last viewed place on load (geolocation is never requested automatically).
    const [initialTarget] = useState<WeatherTarget | null>(() =>
        getProvider().isConfigured() && lastPlace ? { kind: 'place', place: lastPlace } : null
    );
    const [lastTarget, setLastTarget] = useState<WeatherTarget | null>(initialTarget);

    const { data, error, isLoading, load, dismissError } = useWeather();
    const nowMs = useNow(30_000);
    const nowSec = Math.floor(nowMs / 1000);
    const provider = getProvider();
    const configured = provider.isConfigured();
    const { units, timeFormat } = prefs;

    const show = useCallback(
        async (target: WeatherTarget, opts?: { force?: boolean }) => {
            setNotice(null);
            setLastTarget(target);
            const bundle = await load(target, opts);
            if (!bundle) return;
            setLastPlace(bundle.place);
            setRecents(prev => [bundle.place, ...prev.filter(p => p.id !== bundle.place.id)].slice(0, MAX_RECENTS));
        },
        [load, setLastPlace, setRecents]
    );

    useEffect(() => {
        if (initialTarget) void load(initialTarget);
    }, [initialTarget, load]);

    // Refresh stale data when the user comes back to the tab.
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible' && data && Date.now() - data.fetchedAt > CACHE_TTL_MS) {
                void load({ kind: 'place', place: data.place }, { force: true });
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [data, load]);

    useEffect(() => {
        document.title = data
            ? `${formatTemp(data.current.temp, units)} ${data.place.name} · Skycast`
            : 'Skycast — Weather';
    }, [data, units]);

    const refresh = () => data && void load({ kind: 'place', place: data.place }, { force: true });

    const locate = () => {
        if (!('geolocation' in navigator)) {
            setNotice("Your browser doesn't support location. Please search for a city instead.");
            return;
        }
        setLocating(true);
        setNotice(null);
        navigator.geolocation.getCurrentPosition(
            async pos => {
                const { latitude: lat, longitude: lon } = pos.coords;
                let place: Place = {
                    id: placeId(lat, lon),
                    name: '',
                    lat,
                    lon,
                };
                try {
                    place = (await getProvider().reverseGeocode(lat, lon)) ?? place;
                } catch {
                    // Fall back to the name returned by the weather endpoint.
                }
                setLocating(false);
                void show({ kind: 'place', place });
            },
            err => {
                setLocating(false);
                setNotice(geolocationMessage(err));
            },
            {
                enableHighAccuracy: false,
                timeout: 12_000,
                maximumAge: 10 * 60_000,
            }
        );
    };

    const isFavorite = Boolean(data && favorites.some(f => f.id === data.place.id));
    const toggleFavorite = () => {
        if (!data) return;
        const place = data.place;
        setFavorites(prev =>
            prev.some(f => f.id === place.id)
                ? prev.filter(f => f.id !== place.id)
                : [...prev, place].slice(-MAX_FAVORITES)
        );
    };

    // Insights only need re-deriving every few minutes, not on every clock tick.
    const insightClock = Math.floor(nowSec / 300) * 300;
    const insights = useMemo(
        () => (data ? deriveInsights(data, units, timeFormat, insightClock) : []),
        [data, units, timeFormat, insightClock]
    );
    const range = data ? todayRange(data.current, data.forecast) : null;

    // The page is printed in the inks of the current sky (tokens keyed on <html data-sky>).
    // Before any city is loaded, the viewer's own time of day picks a clear sky.
    const localHour = new Date(nowMs).getHours();
    const theme: SkyTheme = data
        ? skyTheme(data.current.condition)
        : localHour >= 6 && localHour < 18
          ? 'clear-day'
          : 'clear-night';
    const intensity = data?.current.condition.intensity ?? 'normal';

    useEffect(() => {
        const root = document.documentElement;
        root.dataset.sky = theme;
        const paper = getComputedStyle(root).getPropertyValue('--paper').trim();
        document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(m => (m.content = paper));
    }, [theme]);

    const retry = lastTarget ? () => void show(lastTarget, { force: true }) : undefined;

    let body;
    if (!configured) {
        body = <SetupRequired />;
    } else if (data) {
        body = (
            <div className={`dashboard ${isLoading ? 'is-updating' : ''}`} aria-busy={isLoading}>
                {/* Two stacked columns on wide screens; `display: contents` below that, so each
                    section is placed individually by the grid areas in App.css. */}
                <div className="dashboard__col">
                    <div className="area-hero">
                        <CurrentHero
                            bundle={data}
                            units={units}
                            timeFormat={timeFormat}
                            range={range}
                            insights={insights}
                            isFavorite={isFavorite}
                            onToggleFavorite={toggleFavorite}
                            onRefresh={refresh}
                            isRefreshing={isLoading}
                            nowMs={nowMs}
                        />
                    </div>
                    <div className="area-hourly">
                        {data.forecast ? (
                            <HourlyForecast
                                current={data.current}
                                forecast={data.forecast}
                                units={units}
                                timeFormat={timeFormat}
                                nowSec={nowSec}
                            />
                        ) : (
                            <section className="section">
                                <p className="app__note">
                                    The forecast couldn’t be loaded right now. Current conditions are still up to date —
                                    try refreshing in a moment.
                                </p>
                            </section>
                        )}
                    </div>
                    <div className="area-metrics">
                        <MetricsGrid current={data.current} forecast={data.forecast} units={units} nowSec={nowSec} />
                    </div>
                </div>
                <div className="dashboard__col">
                    {data.forecast && (
                        <div className="area-daily">
                            <DailyForecast
                                note={provider.forecastNote}
                                forecast={data.forecast}
                                units={units}
                                todayRange={range}
                                nowSec={nowSec}
                            />
                        </div>
                    )}
                    <div className="area-sun">
                        <SunCard current={data.current} timeFormat={timeFormat} nowSec={nowSec} />
                    </div>
                    <div className="area-air">
                        <AirQualityCard air={data.air} />
                    </div>
                </div>
            </div>
        );
    } else if (isLoading) {
        body = <DashboardSkeleton />;
    } else if (error) {
        body = (
            <ErrorState error={error} onRetry={retry}>
                <button type="button" className="btn btn--quiet" onClick={dismissError}>
                    Back
                </button>
            </ErrorState>
        );
    } else {
        body = (
            <Welcome
                onPick={p =>
                    void show({
                        kind: 'place',
                        place: { ...p, id: placeId(p.lat, p.lon) },
                    })
                }
                onLocate={locate}
                locating={locating}
            />
        );
    }

    const unitToggle = (
        <div className="toggle" role="group" aria-label="Temperature unit">
            {(['metric', 'imperial'] as const).map((u, i) => (
                <span key={u} className="toggle__item">
                    {i > 0 && (
                        <span className="toggle__sep" aria-hidden="true">
                            /
                        </span>
                    )}
                    <button
                        type="button"
                        className="toggle__btn"
                        aria-pressed={units === u}
                        aria-label={u === 'metric' ? 'Celsius' : 'Fahrenheit'}
                        onClick={() => setPrefs(p => ({ ...p, units: u }))}
                    >
                        {u === 'metric' ? '°C' : '°F'}
                    </button>
                </span>
            ))}
        </div>
    );

    const timeToggle = (
        <div className="toggle toggle--small" role="group" aria-label="Time format">
            {(['12h', '24h'] as const).map((f, i) => (
                <span key={f} className="toggle__item">
                    {i > 0 && (
                        <span className="toggle__sep" aria-hidden="true">
                            /
                        </span>
                    )}
                    <button
                        type="button"
                        className="toggle__btn"
                        aria-pressed={timeFormat === f}
                        aria-label={f === '12h' ? '12-hour time' : '24-hour time'}
                        onClick={() => setPrefs(p => ({ ...p, timeFormat: f }))}
                    >
                        {f}
                    </button>
                </span>
            ))}
        </div>
    );

    return (
        <div className="app">
            <Backdrop theme={theme} intensity={intensity} />
            {isLoading && <div className="progress" role="progressbar" aria-label="Loading weather" />}

            <div className="shell">
                <header className="topbar">
                    <a className="brand" href="/">
                        <span>Skycast</span>
                        <span className="brand__deg" aria-hidden="true">
                            °
                        </span>
                    </a>
                    {configured && (
                        <div className="topbar__search">
                            <SearchBar
                                onSelectPlace={place => void show({ kind: 'place', place })}
                                onSubmitQuery={query => void show({ kind: 'query', query })}
                                recents={recents}
                                busy={isLoading}
                            />
                        </div>
                    )}
                    <div className="topbar__actions">
                        {configured && (
                            <button
                                type="button"
                                className="link-btn topbar__locate"
                                onClick={locate}
                                disabled={locating}
                                aria-label="Show weather for my location"
                            >
                                <LocateIcon className={locating ? 'spin' : undefined} />
                                <span className="topbar__locate-text">Use my location</span>
                            </button>
                        )}
                        {unitToggle}
                        {timeToggle}
                    </div>
                </header>

                {configured && (
                    <PlacesBar
                        favorites={favorites}
                        recents={recents}
                        currentId={data?.place.id}
                        onSelect={place => void show({ kind: 'place', place })}
                        onRemoveFavorite={place => setFavorites(prev => prev.filter(f => f.id !== place.id))}
                        onClearRecents={() => setRecents([])}
                    />
                )}

                <div className="messages">
                    {notice && <Banner message={notice} onDismiss={() => setNotice(null)} />}
                    {error && data && (
                        <Banner
                            message={error.message}
                            onDismiss={dismissError}
                            onRetry={error.kind === 'not-found' ? undefined : retry}
                        />
                    )}
                </div>

                <main id="main">{body}</main>

                <footer className="footer">
                    <p>
                        Weather data by <a href={provider.url}>{provider.name}</a> · times are local to each location
                    </p>
                </footer>
            </div>
        </div>
    );
}
