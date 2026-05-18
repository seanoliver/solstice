# World Time New Tab

A zero-permission Chrome MV3 extension that replaces the new-tab page with a
single, muted, modern world-clock. One page shows:

- a big local clock,
- per-zone cards with day-part-banded progress bars,
- a 24-hour banded timeline across all zones,
- a color key.

Sunrise and sunset are computed offline (NOAA algorithm) from each zone's
latitude/longitude in `config.js` — no network, no permissions. Each day is
banded into four parts:

- **Morning** — sunrise → 9am
- **Work** — 9am → 5pm
- **Evening** — 5pm → sunset
- **Night**

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the project root.
4. Open a new tab.

## Add / remove cities

Click **Edit** (top-right) to enter edit mode: each card except your local
"You" zone gets an **×** to remove it, and an **Add a city…** search box
appears — type a name, click a result. Click **Done** to return to the calm
default view. Your zone list persists in `localStorage` across new tabs and
restarts. The local zone is pinned and cannot be removed.

The searchable city list lives in `cities.js` (`{ name, tz, lat, lon }`);
append rows to extend it.

## Configure (defaults)

`config.js` `ZONES` is only the **first-run seed** — once you've edited the
list via the UI, `localStorage` is the source of truth. To change the
out-of-box defaults (or reset: clear the `zones` key in `localStorage`),
edit `config.js`:

```js
export const ZONES = [
  { label: "You",    tz: "local",         lat: 37.7749, lon: -122.4194 },
  { label: "London", tz: "Europe/London", lat: 51.5074, lon: -0.1278  },
];
```

Each entry has a `label`, a `tz` (an IANA timezone string, or `"local"` for
the browser's local time), and `lat`/`lon` used for offline sunrise/sunset.
Array order is the display order; the `"local"` zone is rendered first.

## Tests

Run the `node:test` unit suite (covers the time model, sun, band, and
day-part logic) from the project root:

```bash
node --test
```

## Project layout

- `manifest.json` — MV3 manifest, overrides the new-tab page.
- `newtab.html` / `newtab.css` / `newtab.js` — page markup, styles, and app
  wiring (tick loop).
- `config.js` — the first-run default `ZONES` list (`{ label, tz, lat, lon }`).
- `cities.js` — bundled searchable city dataset (`{ name, tz, lat, lon }`).
- `assets/fonts/` — bundled JetBrains Mono variable woff2 (offline, OFL).
- `src/` — `timeModel.js` (zone-row builder), `sun.js` (offline NOAA
  sunrise/sunset), `bands.js` (day-part band segments), `dayPart.js`
  (day-part bucketing + shared palette), `zones.js` (localStorage zone
  store: seed/add/remove, local pinned), and `render.js` (single-page
  renderer + edit bar).
- `test/` — `node:test` unit suites.
- `docs/plans/` — implementation plan.
