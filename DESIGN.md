# Skycast design

This file records the visual direction. Read it before changing UI. The tokens live in `src/styles/tokens.css`.

## World: "the weather poster"

Each forecast is a printed poster for the sky over that place right now, made on Swiss / International Typographic Style principles:

- **One flat field colour per condition, a limited set of inks.** The page is printed like a two- or three-colour screen print: the field (`--paper`), one ink (`--ink`), a secondary ink (`--ink-2`), plus two data spots (`--precip` for rain chance, `--warn` for warnings and the "now" marker). `data-sky` on `<html>` swaps the whole set, so every component re-inks itself.
- **The type is the image.** The temperature is set at poster scale (`--fs-display`, up to 26rem), light weight, tight tracking, on the left of the grid.
- **A strict asymmetric grid.** 12 columns from 900px. The poster uses columns 1–8 for the reading and 9–12 for place and facts. Then the 36-hour chart spans the full measure, then two-up rows (daily | conditions, daylight | air).
- **Heavy rules open sections.** A 2px ink rule over every section, with 1px tint rules between rows. Nothing is boxed.
- **Overprinted weather marks.** These sit behind the page (`Backdrop`): a cropped sun or moon disc, flat cloud shapes, rain hatching, snow dots, fog bands and a rare flash. They are drawn only in tints of the current ink and never compete with the type.

**Mode: Operate.** People come to make a quick decision, so the poster leads with the answer: the temperature, the condition and a one-line forecast headline.

## Fields (primary ink ≥8:1, secondary ink ≥7:1, data spots ≥4.5:1; verified numerically)

| `data-sky`   | field     | ink       | ink-2     | precip    | warn      |
| ------------ | --------- | --------- | --------- | --------- | --------- |
| clear-day    | `#F2B83B` | `#1A1712` | `#3D3119` | `#1B4C9A` | `#8E1B10` |
| cloudy-day   | `#C5CED5` | `#182027` | `#343C43` | `#1A519B` | `#9A2416` |
| snow-day     | `#E2EAF0` | `#13253A` | `#3E4E60` | `#1A519B` | `#9A2416` |
| mist-day     | `#D3CFC5` | `#211F1B` | `#3D3B36` | `#1F5299` | `#982818` |
| rain-day     | `#224B66` | `#FFFFFF` | `#DCE2E7` | `#C4E2FF` | `#FFC6AE` |
| clear-night  | `#15223F` | `#F3EEE4` | `#B9B9B9` | `#93BBFF` | `#FFB08A` |
| cloudy-night | `#222A33` | `#E9EDF0` | `#B5BABF` | `#93BBFF` | `#FF9F80` |
| rain-night   | `#122130` | `#E6EEF4` | `#AFB9C1` | `#8EC5FF` | `#FFA98A` |
| storm        | `#2C2340` | `#F6F2FB` | `#C1BCCA` | `#BCC9FF` | `#FFD45E` |
| snow-night   | `#1B293C` | `#EAF1F7` | `#B4BDC6` | `#93BBFF` | `#FFAA8C` |
| mist-night   | `#25282B` | `#EAE8E3` | `#B7B6B3` | `#9DBFF5` | `#FFA588` |

- Other tints (`--paper-2`, `--rule`, `--rule-strong`) are mixed from field and ink in `tokens.css`; never hard-code them.
- The temperature ramp (`--t-*`, used through `lib/tempColor.ts`) is data colour only, for range bars and curve dots. Scales that must read on every field, like daylight and the AQI steps, use ink tints instead.
- Before a city loads, the viewer's own clock picks `clear-day` or `clear-night`. An inline script in `index.html` sets this before first paint.

## Type

- **One variable family: Archivo** (a grotesque in the Akzidenz lineage), self-hosted via `@fontsource-variable/archivo/wdth.css`, with weight 100–900 and width 62–125%.
    - Wordmark and city name: weight 800, width 112–125%, tight tracking.
    - Temperature: weight 300, width 92%, tracking −0.065em, line-height 0.78.
    - Section titles: weight 700, width 112%, `--fs-22`.
    - Numbers in tables and lists: width 87.5%, weight 500–600, tabular figures.
    - Body: 400, width 100%.
- **Nothing renders below 14px.** The small end of the scale is 14 / 15 / 16px (`--fs-12`, `--fs-13`, `--fs-15`; the names are historical), because secondary text sits on saturated fields. Info-column text on the poster (date line, fact labels, notes, actions) is 18px, and daily-table temperatures are 22px.
- Labels are sentence case. No tracked uppercase eyebrows, no section numbers.

## Shape, depth & motion

- Corners are square (`--r-panel: 0`), and controls get 2px. The only shadow is on the suggestion popover.
- The field colour cross-fades (`--field-dur`) when the sky changes. Weather marks move slowly with transform/opacity only. There are no entrance animations, and `prefers-reduced-motion` freezes everything.

## Icon & favicon

- Weather icons are line glyphs in `currentColor` (`WeatherIcon.tsx`).
- The favicon (`public/favicon.svg`, plus rendered PNGs at 32, 180, 192 and 512 maskable) is the poster in miniature: the clear-day field, a cropped orange sun disc and a heavy ink degree ring.

## Refuse

Glass or blur, gradient backgrounds, cards and tiles, big-number-plus-label stat tiles, eyebrow labels, pill chips, emoji, centred hero cards, fade-up on every section, colours outside the field's ink set, and a second display typeface.
