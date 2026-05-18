# Timeline-Centric Redesign — Decisions

Date: 2026-05-18. Supersedes the multi-view design for the UI layer; the
tested time-model approach carries over.

## What changed

- Drop the 3-view toggle. **Single page**, timeline-centric, modeled on the
  reference screenshot's muted/modern dark language (monospace numerals,
  teal accent, subtle card borders).
- Delete `views/digits.js`, `views/dials.js`, and the old `views/timeline.js`
  (recoverable from git history).
- Page layout (top → bottom):
  1. Header: "WORLD TIME" + status dot (left), full local date (right).
  2. Large local clock: monospace HH:MM, AM/PM, teal seconds accent.
  3. Zone cards row: per zone — tz abbrev, city, big time, date, day-part
     dot, and a **progress bar colored as the full 24h band strip** with a
     marker at the current position.
  4. 24-hour timeline: one banded row per zone + a current-time dot.
  5. Color key / legend (replaces freed space from removed views).

## Cross-day indicator

- Each zone row in the 24h timeline shows a muted `±N` chip after its time
  when that zone's current calendar date differs from the local date
  (`dayOffset` in the model = zone day number − local day number, via
  `ymdNumber`). Same-day rows show nothing, so when every zone shares the
  local date there is no day UI at all (the conditional requirement). Chip
  `title` carries the full date for hover.

## Day/night + bands

- Sunrise/sunset computed **offline** via standard NOAA solar formula from
  each zone's `lat`/`lon`. No network, no permissions, season-correct.
- `config.js` zones are now `{ label, tz, lat, lon }`. Engine is fully
  general: any user-added city with coords works automatically. A
  name→coords city picker is a **future enhancement**, not built now.
- Band precedence per time `t` (first match wins):
  1. `09:00–17:00` → **Work** (fixed 9-5)
  2. `sunrise ≤ t < 09:00` → **Dawn** (lit, pre-work)
  3. `17:00 ≤ t < sunset` → **Evening** (lit, post-work)
  4. else → **Night** (dark)
  Deterministic in winter edge cases (sun set before 17:00 → post-work is
  Night, no Evening that day).
- Card dot color: Work/Dawn → cyan (day), Evening → amber (golden), Night → dim.

## Module shape

- `src/sun.js` — `sunTimesUTC(date, lat, lon)` → `{ sunrise: Date, sunset: Date }`.
- `src/dayPart.js` — `partOfDay(minOfDay, sunriseMin, sunsetMin)`, `PALETTE`,
  `dotColor(part)`.
- `src/bands.js` — `daySegments(sunriseMin, sunsetMin)` → ordered
  `[{ part, startPct, widthPct }]` covering 0–1440.
- `src/timeModel.js` — `zoneNow`, `buildModel` (adds sun, segments,
  dayProgress, dateLabel).
- `src/render.js` + `newtab.js` — DOM only, manual QA.
