# Timezones New Tab

A zero-permission Chrome MV3 extension that replaces the new-tab page with a
readable, simultaneous view of your configured timezones. Three switchable
views — **Timeline**, **Digits**, and **Dials** — with the selected view
persisted in `localStorage`.

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the project root.
4. Open a new tab.

## Configure

Edit `config.js`. The `ZONES` array holds one entry per zone:

```js
export const ZONES = [
  { label: "You",    tz: "local" },
  { label: "London", tz: "Europe/London" },
];
```

Each entry has a `label` and a `tz` (an IANA timezone string, or `"local"` for
the browser's local time). Array order is the display order.

## Tests

Run the `node:test` unit suite (covers the time model and day-part logic) from
the project root:

```bash
node --test
```

## Project layout

- `manifest.json` — MV3 manifest, overrides the new-tab page.
- `newtab.html` / `newtab.css` / `newtab.js` — page markup, styles, and app
  wiring (view toggle, persistence, tick loop).
- `config.js` — the `ZONES` list.
- `src/` — `timeModel.js` (zone-row builder) and `dayPart.js` (day-part
  bucketing + shared palette).
- `views/` — the three renderers: `timeline.js`, `digits.js`, `dials.js`.
- `test/` — `node:test` unit suites.
- `docs/plans/` — implementation plan.
