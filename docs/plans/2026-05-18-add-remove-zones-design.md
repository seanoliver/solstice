# Add / Remove Timezones — Design

Date: 2026-05-18. Approved.

## Goal

Let the user add and remove cities from the world clock at runtime, without
editing `config.js`, while keeping the default page calm.

## Architecture

- **`cities.js`** — bundled static module exporting
  `export const CITIES = [{ name, tz, lat, lon }, …]` for a few hundred
  major world cities. Offline, zero-permission. Feeds the existing
  `sunTimesUTC`/`buildModel` engine with no changes to it.
- **`src/zones.js`** (new, unit-tested) — the zone store:
  - `loadZones()` → reads `localStorage.zones`; if absent/invalid, seeds
    from `config.js` `ZONES` and saves. Always guarantees the local
    `{ tz:"local" }` zone is present (prepended if missing).
  - `addZone(list, city)` → returns new list with `city` appended, deduped
    by `tz`+`name` (no-op if already present).
  - `removeZone(list, key)` → returns new list without that zone; refuses
    to remove the `tz:"local"` zone.
  - `saveZones(list)` → writes JSON to `localStorage.zones`.
- **`config.js`** stays as the default seed only. Runtime truth =
  `localStorage`.
- The local "You" zone remains the reference for the big clock and
  `dayOffset`; it is pinned and non-removable.

## UX

- A small **"Edit"** toggle in the top bar. Default off → calm view, no
  chrome (unchanged from today).
- Edit on:
  - Each card except the local zone shows an `×` remove control.
  - An **"Add city"** search box appears: case-insensitive substring match
    over `CITIES`; clicking a result appends it and persists.
  - Toggle off → back to clean view.
- Edit mode is in-memory only (always starts off / calm).

## Rendering

`#app` is split into two sibling regions:

- `.live` — clock, cards, timeline, legend. Rebuilt every second by the
  existing tick, now sourced from the in-memory zones list instead of the
  static `ZONES` import. Card `×` buttons live here (cheap, click →
  mutate store → immediate rebuild).
- `.editbar` — the Edit toggle + add-search panel. Built only on state
  change (toggle, add, remove), **not** touched by the per-second tick, so
  the search input keeps focus and caret while typing.

State held in a small module scope: `zones` (array), `editMode` (bool),
`query` (string). Mutations persist via `saveZones` and rebuild both
regions.

## Testing

- `src/zones.js` unit-tested with a `localStorage` stub injected:
  seed-on-first-run, add, add-dedupe, remove, remove-local-refused,
  load-after-save round trip.
- Sanity test: every `CITIES` entry has non-empty `name`, a `tz` accepted
  by `Intl.DateTimeFormat`, and finite `lat`/`lon` in range.

## Out of scope (v1)

Reordering, editing an existing city in place, custom coords entry,
cross-machine sync, fuzzy/diacritic-insensitive search.
