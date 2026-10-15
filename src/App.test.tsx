import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { SetupRequired } from './components/States';
import { clearWeatherCache } from './hooks/useWeather';
import { rawAir, rawCurrent, rawForecast } from './test/fixtures';

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const tokyo = rawCurrent({
    name: 'Tokyo',
    coord: { lat: 35.6895, lon: 139.6917 },
    sys: { country: 'JP', sunrise: 1791963000, sunset: 1792004000 },
    timezone: 32400,
    main: { ...rawCurrent().main, temp: 24.2 },
    weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01n' }],
});

type Handler = (url: URL) => Response | Promise<Response>;

function mockApi(handlers: { weather?: Handler } = {}) {
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
        const url = new URL(String(input));
        switch (url.pathname) {
            case '/data/2.5/weather':
                if (handlers.weather) return handlers.weather(url);
                if (url.searchParams.get('q')?.toLowerCase() === 'tokyo') return json(tokyo);
                if (url.searchParams.get('q')?.toLowerCase() === 'atlantisxyz')
                    return json({ cod: '404', message: 'city not found' }, 404);
                return json(rawCurrent());
            case '/data/2.5/forecast':
                return json(rawForecast());
            case '/data/2.5/air_pollution':
                return json(rawAir);
            case '/geo/1.0/direct':
                return json([]);
            default:
                throw new Error(`Unhandled ${url.pathname}`);
        }
    });
}

async function search(user: ReturnType<typeof userEvent.setup>, text: string) {
    const input = screen.getByRole('combobox', { name: /search for a city/i });
    await user.clear(input);
    await user.type(input, `${text}{Enter}`);
}

beforeEach(() => {
    // These tests drive the app through mocked OpenWeather endpoints; Open-Meteo has its own tests.
    vi.stubEnv('VITE_WEATHER_PROVIDER', 'openweather');
    vi.stubEnv('VITE_OPENWEATHER_API_KEY', 'test-key');
    clearWeatherCache();
});
afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe('App', () => {
    it('shows setup instructions when no API key is configured', () => {
        // Vitest runs with import.meta.env.PROD = false, so this is the development variant.
        vi.stubEnv('VITE_OPENWEATHER_API_KEY', '');
        render(<App />);
        expect(screen.getByRole('heading', { name: /add your openweather api key/i })).toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('works without any key on the default provider (Open-Meteo)', () => {
        vi.stubEnv('VITE_WEATHER_PROVIDER', '');
        vi.stubEnv('VITE_OPENWEATHER_API_KEY', '');
        render(<App />);
        expect(screen.getByRole('heading', { name: /check the sky/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Open-Meteo' })).toHaveAttribute('href', 'https://open-meteo.com/');
    });

    it('shows visitors a plain unavailable message in a production build without a key', () => {
        render(<SetupRequired production />);
        expect(screen.getByRole('heading', { name: /weather is temporarily unavailable/i })).toBeInTheDocument();
        expect(screen.queryByText(/\.env\.local/)).not.toBeInTheDocument();
    });

    it('starts on a welcome screen without requesting location', () => {
        const geo = vi.fn();
        Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: geo }, configurable: true });
        render(<App />);
        expect(screen.getByRole('heading', { name: /check the sky/i })).toBeInTheDocument();
        expect(geo).not.toHaveBeenCalled();
    });

    it('searches a city and renders current conditions and forecasts', async () => {
        mockApi();
        const user = userEvent.setup();
        render(<App />);

        await search(user, 'London');

        expect(await screen.findByRole('heading', { name: 'London', level: 1 })).toBeInTheDocument();
        const hero = screen.getByRole('region', { name: 'London' });
        expect(within(hero).getByText('United Kingdom')).toBeInTheDocument();
        expect(screen.getByLabelText('18° Celsius')).toBeInTheDocument();
        expect(within(hero).getByRole('img', { name: 'Overcast clouds' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /next 36 hours/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /-day forecast/i })).toBeInTheDocument();
        expect(screen.getByText('Fair')).toBeInTheDocument(); // AQI 2
    });

    it('rejects blank searches without calling the API', async () => {
        const fetchMock = mockApi();
        const user = userEvent.setup();
        render(<App />);
        await user.type(screen.getByRole('combobox'), '   {Enter}');
        expect(screen.getByRole('alert')).toHaveTextContent(/type a city name/i);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('switches units and remembers the choice', async () => {
        mockApi();
        const user = userEvent.setup();
        const { unmount } = render(<App />);
        await search(user, 'London');
        await screen.findByLabelText('18° Celsius');

        await user.click(screen.getByRole('button', { name: 'Fahrenheit' }));
        expect(screen.getByLabelText('65° Fahrenheit')).toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem('skycast:prefs')!)).toMatchObject({ units: 'imperial' });

        unmount();
        render(<App />);
        // Last place is restored from storage, shown in the saved unit.
        expect(await screen.findByLabelText('65° Fahrenheit')).toBeInTheDocument();
    });

    it('saves and removes favorites', async () => {
        mockApi();
        const user = userEvent.setup();
        render(<App />);
        await search(user, 'London');
        await screen.findByRole('heading', { name: 'London', level: 1 });

        await user.click(screen.getByRole('button', { name: /save london to favorites/i }));
        const nav = screen.getByRole('navigation', { name: /saved and recent places/i });
        expect(within(nav).getByRole('button', { name: /remove london from favorites/i })).toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem('skycast:favorites')!)).toHaveLength(1);

        await user.click(within(nav).getByRole('button', { name: /remove london from favorites/i }));
        expect(JSON.parse(localStorage.getItem('skycast:favorites')!)).toHaveLength(0);
    });

    it('keeps the current weather on screen when a later search fails', async () => {
        mockApi();
        const user = userEvent.setup();
        render(<App />);
        await search(user, 'London');
        await screen.findByRole('heading', { name: 'London', level: 1 });

        await search(user, 'Atlantisxyz');
        expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't find that place/i);
        expect(screen.getByRole('heading', { name: 'London', level: 1 })).toBeInTheDocument();
    });

    it('shows an error screen when the first search fails', async () => {
        mockApi({ weather: () => json({ cod: 429 }, 429) });
        const user = userEvent.setup();
        render(<App />);
        await search(user, 'London');
        expect(await screen.findByRole('heading', { name: /weather unavailable/i })).toBeInTheDocument();
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    });

    it('ignores a slow earlier response that arrives after a newer one', async () => {
        let releaseLondon!: () => void;
        mockApi({
            weather: url => {
                if (url.searchParams.get('q') === 'Tokyo') return json(tokyo);
                if (url.searchParams.get('q') === 'London') {
                    return new Promise<Response>(resolve => {
                        releaseLondon = () => resolve(json(rawCurrent()));
                    });
                }
                return json(rawCurrent());
            },
        });
        const user = userEvent.setup();
        render(<App />);

        await search(user, 'London');
        await search(user, 'Tokyo');
        expect(await screen.findByRole('heading', { name: 'Tokyo', level: 1 })).toBeInTheDocument();

        await act(async () => releaseLondon());
        await waitFor(() => expect(screen.getByRole('heading', { name: 'Tokyo', level: 1 })).toBeInTheDocument());
        expect(screen.queryByRole('heading', { name: 'London', level: 1 })).not.toBeInTheDocument();
    });

    it('handles denied location permission gracefully', async () => {
        Object.defineProperty(navigator, 'geolocation', {
            configurable: true,
            value: {
                getCurrentPosition: (_ok: unknown, fail: (e: GeolocationPositionError) => void) =>
                    fail({
                        code: 1,
                        PERMISSION_DENIED: 1,
                        POSITION_UNAVAILABLE: 2,
                        TIMEOUT: 3,
                        message: '',
                    } as GeolocationPositionError),
            },
        });
        const user = userEvent.setup();
        render(<App />);
        await user.click(screen.getByRole('button', { name: /show weather for my location/i }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/location access was denied/i);
    });
});
