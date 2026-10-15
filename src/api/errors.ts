/**
 * Errors and HTTP plumbing shared by every weather provider. Messages are user-facing and never
 * include the request URL (which may contain an API key).
 */

export type WeatherErrorKind =
    'missing-key' | 'invalid-key' | 'not-found' | 'rate-limited' | 'network' | 'server' | 'bad-request' | 'unknown';

const MESSAGES: Record<WeatherErrorKind, string> = {
    'missing-key': 'No OpenWeather API key is configured.',
    'invalid-key':
        'The OpenWeather API key was rejected. It may be invalid or not activated yet (new keys can take a couple of hours).',
    'not-found': "We couldn't find that place. Check the spelling, or try adding a country code like “Paris, FR”.",
    'rate-limited': 'Too many requests to the weather service right now. Please wait a minute and try again.',
    network: "Couldn't reach the weather service. Check your internet connection and try again.",
    server: 'The weather service is having trouble right now. Please try again shortly.',
    'bad-request': "That search couldn't be processed. Try a different city name.",
    unknown: 'Something went wrong while loading the weather.',
};

export class WeatherApiError extends Error {
    readonly kind: WeatherErrorKind;
    readonly status?: number;

    constructor(kind: WeatherErrorKind, status?: number) {
        super(MESSAGES[kind]);
        this.name = 'WeatherApiError';
        this.kind = kind;
        this.status = status;
    }
}

export function kindForStatus(status: number): WeatherErrorKind {
    if (status === 401 || status === 403) return 'invalid-key';
    if (status === 404) return 'not-found';
    if (status === 429) return 'rate-limited';
    if (status === 400) return 'bad-request';
    if (status >= 500) return 'server';
    return 'unknown';
}

export function isAbortError(e: unknown): boolean {
    return e instanceof DOMException && e.name === 'AbortError';
}

/** GET a JSON document, mapping every failure to a WeatherApiError (aborts are rethrown as-is). */
export async function getJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
    let res: Response;
    try {
        res = await fetch(url, { signal });
    } catch (e) {
        if (isAbortError(e)) throw e;
        throw new WeatherApiError('network');
    }
    if (!res.ok) throw new WeatherApiError(kindForStatus(res.status), res.status);
    try {
        return (await res.json()) as T;
    } catch {
        throw new WeatherApiError('server', res.status);
    }
}
