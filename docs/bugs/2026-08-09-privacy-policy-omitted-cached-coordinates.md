# Privacy policy said detected coordinates were not stored after they were cached

**Date:** 2026-08-09
**Status:** Fixed
**Severity:** Important
**Last verified:** `e663405` on 2026-08-09
**Related:** `docs/bugs/2026-07-08-local-sun-times-use-seed-coords.md`

## Symptom

`PRIVACY.md` said browser-geolocation coordinates were “not stored” and that only the detected city name was cached. The extension actually cached both the city and coordinates for 24 hours. The discrepancy was found while adapting the policy for the new website.

## Root cause

The July 2026 fix for local daylight accuracy changed `src/geo.js` so `writeCachedGeo` and `writeCachedIp` persist finite `lat` and `lon` values with the city. Those coordinates let `resolveLocalCoords` calculate daylight from the detected location. The implementation and its bug journal were updated, but the May 2026 privacy policy was not included in the change surface.

## Reproduction

1. Read the browser-geolocation section of the pre-fix `PRIVACY.md`; it states that coordinates are not stored.
2. Follow `refreshLocation` in `src/geo.js` into `writeCachedGeo` or `writeCachedIp`.
3. Observe that the serialized `geoCityV2` and `ipCityV1` cache entries include `lat` and `lon` for 24 hours when both are finite.

## Fix

- Updated `PRIVACY.md` to disclose that detected city names and coordinates are cached locally for 24 hours to avoid repeated lookups and calculate sunrise/sunset.
- Made the browser-geolocation and IP-fallback descriptions explicit about what is sent to third parties and what remains cached locally.
- Used the corrected disclosure in `README.md`, `docs/chrome-web-store-listing.md`, and `web/src/pages/privacy.astro`.

## Verification

The corrected text was checked against `refreshLocation`, `writeCachedGeo`, `writeCachedIp`, `resolveLocalCoords`, and `TTL_MS` in `src/geo.js` at `e663405`.

## Recurrence guardrail

`AGENTS.md` now requires any change to extension storage, location, permissions, or network behavior to review the policy, README summary, store disclosure, and hosted policy in the same change. This is a documentation guardrail rather than an automated test because correctness depends on describing the semantics of the change, not merely matching a host or storage-key list.

## Follow-ups

`PRIVACY.md` remains the policy linked from the Chrome Web Store. The Astro page is a hosted copy and must stay synchronized until the policy has one generated content source.
