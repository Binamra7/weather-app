# Skycast — Weather

A fast, client-side weather app built with React, TypeScript and Vite, powered by the [OpenWeather](https://openweathermap.org/) free API. Search any city and the page prints itself as a poster in the colours of that sky: current conditions, a 36-hour forecast, a 5-day outlook, air quality and daylight, all in the location's local time.

There is **no backend**: the browser calls OpenWeather directly.

![Skycast on three phones: sunny Lisbon, rainy New York and clear-night Seoul](docs/screenshots/00-cover-phones.png)

## Screenshots

All screenshots use live OpenWeather data captured on 14 October 2026.

|                                                                                     |                                                                                     |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| ![Sunny Lisbon on desktop](docs/screenshots/01-desktop-sunny-lisbon.png)            | ![Clear night in Seoul on desktop](docs/screenshots/02-desktop-night-seoul.png)     |
| ![Heavy rain in New York on desktop](docs/screenshots/03-desktop-rain-new-york.png) | ![City search with suggestions](docs/screenshots/09-desktop-search-suggestions.png) |

![Six cities, six skies, six posters](docs/screenshots/10-skies-grid.png)

| 36-hour meteogram                                                  | 6-day forecast                                                         |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| ![36-hour meteogram](docs/screenshots/07-detail-36-hour-chart.png) | ![6-day forecast table](docs/screenshots/08-detail-6-day-forecast.png) |

There is also a [full-page desktop capture](docs/screenshots/04-desktop-full-page.png), a [tablet view](docs/screenshots/05-tablet-overcast-london.png), and individual phone screens for [Lisbon](docs/screenshots/06a-phone-sunny-lisbon.png), [New York](docs/screenshots/06b-phone-rain-new-york.png) and [Seoul](docs/screenshots/06c-phone-night-seoul.png).

## Features

- **City search** with debounced suggestions (Geocoding API), full keyboard support (↑/↓, Enter, Esc), and Enter-to-search for free text such as `Paris, FR`.
- **Current conditions**: temperature, feels-like, today's high/low, description, wind speed/direction/gusts, humidity and dew point, visibility, pressure, cloud cover and precipitation.
- **Forecasts**: a 36-hour meteogram in 3-hour steps (temperature curve, precipitation-chance bars, shaded night, condition changes), and a 5–6 day table with range bars on a shared scale.
- **Daylight** as a 24-hour bar with sunrise, sunset and remaining daylight; **air quality** (AQI 1–5 with PM2.5, PM10, O₃, NO₂).
- **Weather visuals**: each forecast is printed as a poster in that sky's colours (11 condition × day/night palettes), with the temperature set at poster scale and flat overprinted weather marks (sun or moon disc, cloud shapes, rain hatching, snow, fog, lightning). Weather icons are drawn line glyphs. Everything is local; there are no external image dependencies.
- **Highlights** derived from real data, e.g. “Rain likely around 9 PM (80% chance)”, strong gusts, wind chill and poor air.
- **Personalisation (localStorage)**: °C/°F, 12/24-hour time, favorites, recent searches, and the last viewed place restored on load.
- **Current location**, only when you press the location button. Permission is never requested automatically, and denial is handled gracefully.
- **Resilient states**: weather-shaped skeletons, previous data kept on screen during and after a failed search, clear messages for unknown cities, offline/network errors, rate limits and invalid keys, and partial results if the forecast or air-quality call fails.
- **Accessibility**: labelled controls, ARIA combobox search, labelled weather icons, visible focus rings, ≥44px touch targets, text contrast of at least 7:1 for secondary text on every sky palette, and `prefers-reduced-motion` support.

## Getting started

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```bash
npm install
cp .env.example .env.local   # then add your key (see below)
npm run dev                  # http://localhost:3000
```

### API key

1. Create a free account and key at <https://home.openweathermap.org/api_keys>. New keys can take up to a couple of hours to activate.
2. Put it in `.env.local` (gitignored):

    ```
    VITE_OPENWEATHER_API_KEY=your_key_here
    ```

3. Restart the dev server.

Without a key the app shows setup instructions instead of failing.

> **Security note:** variables prefixed `VITE_` are embedded in the JavaScript bundle at build time. Anyone can read the key from a deployed site, so it is **not a secret**. That is inherent to a frontend-only app. Use a free-tier key, monitor its usage in your OpenWeather dashboard, and rotate it if it's abused. Never commit it.

## API usage and plan requirements

All endpoints used are included in OpenWeather's **free** plan:

| Endpoint                      | Used for                                           |
| ----------------------------- | -------------------------------------------------- |
| `GET /data/2.5/weather`       | Current conditions, sunrise/sunset, UTC offset     |
| `GET /data/2.5/forecast`      | 5-day / 3-hour forecast (hourly strip, daily list) |
| `GET /data/2.5/air_pollution` | Current air quality                                |
| `GET /geo/1.0/direct`         | Search suggestions                                 |
| `GET /geo/1.0/reverse`        | Naming your current location                       |

A typical search costs 3 calls. Results are cached in memory for 10 minutes (OpenWeather's own update interval). Suggestions are debounced (350 ms, min. 3 characters) and cached. Superseded requests are aborted. The free tier allows 60 calls/minute.

### Known limitations

- **No UV index, and no true hourly or daily forecasts.** Those come from One Call 3.0, which needs a separate “One Call by Call” subscription; the free key returns `401` for it. The hourly strip therefore uses 3-hour steps, and daily highs/lows are aggregated from 3-hour slots. They can differ slightly from a station's true daily extremes, and the last day may be partial.
- **Today's high/low** combines the current reading with today's remaining forecast slots. OpenWeather's current `temp_min/temp_max` fields describe the spread across a city's stations right now, not the day's range, so they're not used.
- **Local times** use OpenWeather's fixed UTC offset for each location. These are correct for the current moment, but a forecast that crosses a daylight-saving change may be off by an hour around the switch.
- Search suggestions depend on OpenWeather's geocoder, which sometimes ranks smaller places first; free-text Enter search uses the weather endpoint's own city matching.

## Scripts

| Command              | Description                                    |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Start the dev server on port 3000              |
| `npm run build`      | Type-check and build to `dist/`                |
| `npm run preview`    | Serve the production build locally             |
| `npm test`           | Run unit and integration tests (Vitest)        |
| `npm run test:watch` | Tests in watch mode                            |
| `npm run lint`       | ESLint                                         |
| `npm run typecheck`  | TypeScript project check                       |
| `npm run format`     | Format with Prettier (`format:check` verifies) |

The build output in `dist/` is static and can be deployed to any static host (Netlify, Vercel, GitHub Pages, S3…). Set `VITE_OPENWEATHER_API_KEY` in the host's build environment.

## Design

The visual direction ("the weather poster", Swiss / International Typographic Style) is written down in [`DESIGN.md`](DESIGN.md), and the tokens are in `src/styles/tokens.css`. Read both before changing UI. The typeface (Archivo, variable weight and width) is self-hosted via `@fontsource-variable`, so the app makes no third-party font requests. The favicon and app icons are in `public/`.

## Project structure

```
src/
  api/          OpenWeather client (errors, cancellation) and raw response types
  lib/          normalisation, condition mapping, formatting/units, insights, storage
  hooks/        useWeather (stale-response protection + cache), useStoredState, useNow
  components/   UI: SearchBar, CurrentHero, HourlyForecast, DailyForecast, Details,
                PlacesBar, WeatherIcon, Backdrop, States
  styles/       design tokens and global primitives
  test/         test setup and fixtures modelled on real API responses
```

Components only consume normalised types (`lib/types.ts`). All values are stored in metric units and converted at display time.
