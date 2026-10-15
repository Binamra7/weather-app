import { openMeteo } from './openMeteo';
import { openWeather } from './openWeather';
import type { WeatherProvider } from './provider';

export { isAbortError, WeatherApiError, type WeatherErrorKind } from './errors';
export type { WeatherProvider, WeatherTarget } from './provider';

/**
 * The one place that decides which weather provider the app uses. Choose with
 * VITE_WEATHER_PROVIDER at build time; unknown or empty values fall back to the default.
 */
const PROVIDERS = {
    'open-meteo': openMeteo,
    openweather: openWeather,
} satisfies Record<string, WeatherProvider>;

export type ProviderId = keyof typeof PROVIDERS;

export const DEFAULT_PROVIDER: ProviderId = 'open-meteo';

function isProviderId(v: string): v is ProviderId {
    return Object.hasOwn(PROVIDERS, v);
}

export function getProvider(): WeatherProvider {
    const requested = (import.meta.env.VITE_WEATHER_PROVIDER ?? '').trim().toLowerCase();
    return PROVIDERS[isProviderId(requested) ? requested : DEFAULT_PROVIDER];
}
