/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Weather data source: "open-meteo" (default, no key) or "openweather". */
    readonly VITE_WEATHER_PROVIDER?: string;
    /** OpenWeather API key, only needed when VITE_WEATHER_PROVIDER=openweather. Bundled into the client build — not a secret. */
    readonly VITE_OPENWEATHER_API_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
