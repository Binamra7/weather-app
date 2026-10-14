/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** OpenWeather API key. Bundled into the client build — not a secret. */
    readonly VITE_OPENWEATHER_API_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
