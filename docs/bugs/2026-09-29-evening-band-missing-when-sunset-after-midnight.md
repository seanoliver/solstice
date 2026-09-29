# Evening band missing when sunset falls after midnight

**Date:** 2026-09-29
**Status:** Fixed
**Severity:** Minor
**Last verified:** branch `feat/twilight-gradient` on 2026-09-29
**Related:** [#25](https://github.com/seanoliver/solstice/issues/25) (twilight gradient, where it was found)

## Symptom

For a high-latitude zone near midsummer, the day bands showed night from
17:00 onward. Reykjavik on 2026-06-21 had no evening band, even though the sun
sets just after midnight. The twilight gradient made it obvious: the strip
faded from work straight into night across the whole evening.

## Root cause

`buildModel` converts the UTC sunset to minutes of the zone's day with
`minutesInZone`, which only returns 0–1439. Reykjavik's sunset is 00:03 the
next day, so `sunsetMin` came out as 3, earlier than `sunriseMin` (175).
`daySegments` and `partOfDay` assume `sunriseMin < sunsetMin`, so every minute
after 17:00 read as "after sunset".

## Reproduction

```js
buildModel(
  [{ label: "Reykjavik", tz: "Atlantic/Reykjavik", lat: 64.1466, lon: -21.9426 }],
  new Date("2026-06-21T12:00:00Z"),
)[0].segments.map((s) => s.part);
// before: ["night", "morning", "work", "night"]
```

## Fix

`src/timeModel.js` `buildModel`: when `sunsetMin < sunriseMin`, the sunset
(if it reads before noon) or the sunrise (otherwise) has wrapped onto the
neighboring day, so it is pinned to 1440 or 0 respectively. Civil dawn and
dusk get the same treatment for the twilight gradient.

## Verification

- New test in `test/timeModel.test.js`: Reykjavik on 2026-06-21 has
  `sunsetMin` 1440 and segments night, morning, work, evening. It failed
  before the fix and passes after.
- `node --test`: 85 pass.
- Rendered in Chromium: Reykjavik's evening band runs to midnight.

## Recurrence guardrail

The Reykjavik test above. The invariant is that `buildModel` always passes
`daySegments` a `sunriseMin` that is not after `sunsetMin`.
