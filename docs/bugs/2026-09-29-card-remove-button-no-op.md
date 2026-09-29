# Card × button did not remove zones added from search

**Date:** 2026-09-29
**Status:** Fixed
**Severity:** Important
**Last verified:** branch `feat/motion` on 2026-09-29
**Related:** [#27](https://github.com/seanoliver/solstice/issues/27) (found while building motion)

## Symptom

In edit mode, clicking the × on a zone card did nothing for any zone added
through city search, including the seeded New York, London, and Tokyo. The ×
next to the same zone in the Edit panel's list worked.

## Root cause

The card × passes its display row from `buildModel` to `ctx.onRemove`, and
`onRemove` in `newtab.js` finds the zone with
`z.tz === row.tz && z.name === row.name`. `buildModel` never copied `name`
onto its rows, so `row.name` was `undefined` and matched no zone that has a
name. The panel × passes the stored zone itself, which has `name`, so it
worked. `onRename` from the panel has the same shape and was unaffected.

## Reproduction

Open Edit and click the × on the London card. London stays. Stored `zones`
in `localStorage` are unchanged.

## Fix

`src/timeModel.js` `buildModel`: rows now include `name: z.name`.

## Verification

- New test in `test/timeModel.test.js` asserts rows carry the zone's name. It
  failed before the fix and passes after.
- `node --test`: 90 pass.
- Chromium: clicking London's card × removes it from the cards, the timeline,
  and stored zones.

## Recurrence guardrail

The test above. Any handler that receives a model row and looks up the stored
zone depends on `buildModel` carrying the zone's identity (`tz` and `name`).
