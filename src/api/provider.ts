import type { Place, WeatherBundle } from '../lib/types';

export type WeatherTarget = { kind: 'query'; query: string } | { kind: 'place'; place: Place };

/**
 * Everything the app needs from a weather data source. Each provider converts its own payloads
 * into the normalized types in `src/lib/types.ts`, so components never know which one is active.
 * Add a provider by implementing this interface and registering it in `weather.ts`.
 */
export interface WeatherProvider {
    readonly id: string;
    /** Shown in the attribution footer. */
    readonly name: string;
    readonly url: string;
    /** One line under the daily forecast describing where it comes from. */
    readonly forecastNote: string;
    /** False when the provider needs configuration (e.g. an API key) that is missing. */
    isConfigured(): boolean;
    /** City search for autocomplete, up to 5 matches. */
    searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]>;
    /** Coordinates → place name, for the browser's current location. */
    reverseGeocode(lat: number, lon: number, signal?: AbortSignal): Promise<Place | null>;
    /**
     * Loads everything for one location. Current conditions are required; the forecast and air
     * quality degrade to `null` on failure so a partial outage still shows real data.
     */
    fetchWeatherBundle(target: WeatherTarget, signal?: AbortSignal): Promise<WeatherBundle>;
}
