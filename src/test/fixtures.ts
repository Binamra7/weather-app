import type { RawAirPollution, RawCurrent, RawForecast, RawForecastItem, RawGeoResult } from '../api/openWeatherTypes';

/** Shapes mirror real OpenWeather responses captured from the free-plan endpoints. */

export const NOW = 1791990070; // 2026-10-14T16:21:10Z

export function rawCurrent(overrides: Partial<RawCurrent> = {}): RawCurrent {
    return {
        coord: { lon: -0.1257, lat: 51.5085 },
        weather: [{ id: 804, main: 'Clouds', description: 'overcast clouds', icon: '04d' }],
        main: { temp: 18.41, feels_like: 17.9, temp_min: 18.41, temp_max: 18.41, pressure: 1026, humidity: 61 },
        visibility: 10000,
        wind: { speed: 4.83, deg: 221, gust: 11.01 },
        clouds: { all: 98 },
        dt: NOW,
        sys: { country: 'GB', sunrise: 1791958933, sunset: 1791997832 },
        timezone: 3600,
        id: 2643743,
        name: 'London',
        cod: 200,
        ...overrides,
    };
}

export function forecastItem(dt: number, temp: number, overrides: Partial<RawForecastItem> = {}): RawForecastItem {
    return {
        dt,
        main: { temp, feels_like: temp - 0.5, temp_min: temp, temp_max: temp, humidity: 70 },
        weather: [{ id: 803, main: 'Clouds', description: 'broken clouds', icon: '04d' }],
        clouds: { all: 75 },
        wind: { speed: 3.6, deg: 200, gust: 7.9 },
        visibility: 10000,
        pop: 0,
        sys: { pod: 'd' },
        ...overrides,
    };
}

/** 40 three-hour slots starting at the next 3h boundary after NOW. */
export function rawForecast(
    timezone = 3600,
    tempAt: (i: number) => number = i => 14 + 4 * Math.sin(i / 2)
): RawForecast {
    const start = Math.ceil(NOW / 10800) * 10800;
    return {
        cnt: 40,
        list: Array.from({ length: 40 }, (_, i) => forecastItem(start + i * 10800, tempAt(i))),
        city: {
            name: 'London',
            country: 'GB',
            timezone,
            sunrise: 1791958933,
            sunset: 1791997832,
            coord: { lat: 51.5085, lon: -0.1257 },
        },
    };
}

export const rawAir: RawAirPollution = {
    list: [
        {
            main: { aqi: 2 },
            components: { co: 133.01, no: 0.19, no2: 5.49, o3: 79.61, so2: 3.18, pm2_5: 3.68, pm10: 11.44, nh3: 0.18 },
            dt: NOW,
        },
    ],
};

export const rawGeoParis: RawGeoResult[] = [
    {
        name: 'Paris',
        local_names: { en: 'Paris' },
        lat: 48.8588897,
        lon: 2.3200410217200766,
        country: 'FR',
        state: 'Ile-de-France',
    },
    { name: 'Paris', lat: 33.6617962, lon: -95.555513, country: 'US', state: 'Texas' },
];
