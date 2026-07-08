# Local card showed New York's sun times regardless of user location

- Date: 2026-07-08
- Area: `src/geo.js` cascade + `src/timeModel.js` `buildModel` + `config.js` seed
- Severity: medium (visibly wrong sunrise/sunset on the primary card for any
  user far from the seed coords)

## Symptom

In San Francisco on July 8, the local card and 24-hour timeline showed
sunrise ≈ 2:30 AM and sunset ≈ 5:30 PM. Actual SF times were 5:52 AM /
8:35 PM. The card's *label* correctly said "San Francisco" (geo cascade),
which made the wrong sun bands look like a math bug in `sun.js`.

## Root Cause

The local zone's `lat`/`lon` were hardcoded to New York in the `config.js`
seed (`lat: 40.7128, lon: -74.0060`) and persisted to `localStorage.zones`
on first install. The geo cascade (`src/geo.js`) only overrode the local
card's **label** with the detected city — the coords feeding `sunTimesUTC`
in `buildModel` never updated. Result: NYC's sun times (5:32 AM / 8:29 PM
EDT) rendered on a Pacific clock as 2:32 AM / 5:29 PM PDT — exactly the
observed bands. (`sunTimesUTC` itself was verified accurate to within a
couple of minutes for both cities.)

This was a known ROADMAP item ("Local-zone sun bands track geolocation")
that had not been prioritized because the label masking made it subtle.

## Trigger Steps

1. Install the extension anywhere far from NYC (e.g. Pacific time).
2. Allow geolocation (or IP detection) so the local label resolves to your
   city.
3. Compare the local card's orange sunrise/sunset band boundaries to real
   local sun times: they match NYC's sun times shifted into your zone.

## Fix

Plumb detected coords through the whole cascade (PR: fix/local-zone-sun-coords):

- `src/geo.js`: `resolveCity` returns `{city, lat, lon}` using the device's
  geolocation coords; `fetchCityIP` extracts `latitude`/`longitude` from the
  IP providers (all three report those fields); `writeCachedGeo`/
  `writeCachedIp` persist coords alongside the city; new
  `resolveLocalCoords(storage)` reads geo-cache > ip-cache > `null`.
- `src/timeModel.js`: `buildModel(zones, at, localLabel, localCoords)` uses
  `localCoords` for the `tz === "local"` row's `sunTimesUTC` call when both
  values are finite; seed coords remain the offline/undetected fallback.
- `newtab.js`: resolves `localCoords` at startup and after `refreshGeo`,
  passes it to every `buildModel` call.
- Migration: `needsRefresh` now treats a fresh but coord-less geo cache
  (the pre-coords format) as needing one refresh, so existing installs
  upgrade their cache within a day instead of waiting for TTL expiry.

Deliberate scope choice: a manual "home" label stays label-only. The local
card shows the user's physical location's daylight — the coords cascade
ignores `homeCity` (and detection is still skipped entirely while home is
set, matching the existing no-network-when-manual behavior).

## Verification

- New unit tests (RED first, then GREEN): coords cascade precedence,
  stale/coord-less cache handling, `buildModel` override + non-local
  isolation + malformed-coords fallback, `needsRefresh` migration case.
- Full suite: 63/63 pass (`node --test`).
- Numeric spot check: `sunTimesUTC` with SF coords returns 5:55 AM /
  8:34 PM PDT for 2026-07-08 (true: 5:52 / 8:35).

## Guardrail

Same class of bug as 2026-05-20 (edit-panel label mismatch): the persisted
`zones[0]` seed and the runtime geo cascade are two sources of truth for
the local zone. The cascade is canonical for anything user-location-derived
— label **and** coords. If a new field of the local zone ever depends on
where the user actually is, it must come from `src/geo.js` resolution, not
from `zones[0]`. The seed's `lat`/`lon` are only the offline fallback; the
`config.js` comment now states this.
