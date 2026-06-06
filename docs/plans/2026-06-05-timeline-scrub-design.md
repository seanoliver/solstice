# Timeline Scrub — Design

Date: 2026-06-05.

Drag any 24-hour timeline marker to a new time; every other timeline, every
card, and the big local clock re-derive to the same absolute instant. Answers
"when it's 3pm here, what time is it everywhere?" The clock freezes at the
scrubbed instant until reset.

## Why this is cheap

The whole UI is already a pure function of one timestamp: `buildModel(zones,
at, localLabel)` derives every card, every timeline marker, and the big local
clock from `at`. The 1Hz `tick()` just calls it with `new Date()`.

Scrubbing therefore means: feed `buildModel` a **virtual `at`** instead of
now. Dragging a marker on zone X's timeline sets a target time-of-day in
zone X; we compute the absolute instant that satisfies it; every other row
re-derives for free. No per-zone state, no duplicated time math.

Approaches considered:

- **Single virtual timestamp (chosen).** One `scrubAt` value flows through the
  existing `buildModel`. Minimal new state, reuses all rendering.
- Per-zone offsets — rejected; all zones share one absolute instant, so
  per-zone state is redundant and invites drift bugs.
- CSS-only marker drag with per-row recompute — rejected; duplicates the
  time math `buildModel` already owns.

## Interaction (decided during brainstorming)

- **Release behavior:** stay scrubbed, **frozen**. On release the UI is pinned
  to the exact scrubbed instant; seconds stop advancing.
- **Return to live:** a **"Now" reset pill** (also the scrubbed-state
  indicator) and the **Escape key**, both call `resetScrub()`.
- **Snapping:** marker snaps to the nearest **15 minutes** while dragging.

## State (`newtab.js`)

- Add `let scrubAt = null`. `null` = live; non-null = frozen at that instant.
- Every `buildModel(...)` call uses `scrubAt ?? new Date()`.
- `tick()` early-returns when `scrubAt` is set, so seconds freeze. Reset nulls
  `scrubAt`; the next tick resumes live.
- Context (`ctx()`) gains:
  - `scrubAt` (passed to render so it can show the pill / `scrubbed` class).
  - `onScrub(zoneIdx, pct)` → sets `scrubAt = scrubToInstant(...)`, repaints.
  - `onResetScrub()` → `scrubAt = null`, repaints.
- A document-level `keydown` listener resets on Escape when scrubbed.

## Mapping (pure, `timeModel.js`, unit-tested)

```js
// base: the day anchor (current scrubAt or now). tz: dragged zone. pct: 0..1.
export function scrubToInstant(base, tz, pct) {
  const clamped = Math.min(1, Math.max(0, pct));
  // 1425 = 23:45, the last snap slot — never round up into the next day.
  const m = Math.min(1425, Math.round((clamped * 1440) / 15) * 15);
  const mCur = minutesInZone(base, tz);
  let t = base.getTime() + (m - mCur) * 60000;
  // One correction pass for DST / half-hour offset zones:
  t += (m - minutesInZone(new Date(t), tz)) * 60000;
  return new Date(t);
}
```

Keeps the dragged zone on its current calendar day; other zones may roll to
±1 day, which the existing `dayOffset` chip already renders. `minutesInZone`
already exists in `timeModel.js` (currently module-private — export it).

Tests cover: a normal drag, a half-hour-offset zone (Asia/Kolkata), and a
zone on a DST-transition day.

## Drag wiring (`render.js`)

- New `attachScrub(timelineEl, ctx)`, mirroring the existing `attachDrag`
  reorder handler: pointer-capture on the tall `.strip`s inside the
  "24 Hour Timeline" section.
- `pointermove` → `pct` from `clientX` vs the strip's bounding rect (clamp
  0..1) → `ctx.onScrub(zoneIdx, pct)` → sets `scrubAt`, repaints via the
  in-place `updateLive` path (cheap; no teardown).
- Markers on **all** rows move because every `dayProgress` derives from
  `scrubAt`. Live readouts track the drag.

## Scrubbed-state UI

- A pill in the topbar: `⏸ 3:00 PM · Reset` (scrubbed local time + a date
  chip when offset). The whole pill is the reset button; shown only while
  scrubbed.
- `.live.scrubbed` class on the live root → CSS hides the `.future` dim
  overlay on every strip (meaningless once an arbitrary instant is pinned)
  and may accent markers.
- Big clock shows the frozen time with the seconds counter hidden — a pinned
  instant has no ticking seconds (`.live.scrubbed .big .secs { display:none }`).

## Scope decisions (flagged, can override)

1. Drag targets = the tall timeline strips only, **not** the small card
   markers ("in any of the 24-hour timelines").
2. Scrub is available only with **2+ zones** (the timeline is hidden for a
   solo zone) and only **outside edit mode**.
3. While scrubbed, the future-dim overlay is hidden on every strip.

## Verification

- `node --test` unit tests for `scrubToInstant` (normal / half-hour / DST).
- Manual browser QA: drag across zones, verify all rows + big clock track and
  freeze; verify pill + Escape both reset; verify edit mode and solo-zone
  disable scrub. (No Playwright yet — still a roadmap item.)

## Out of scope (this change)

- Timeline-scrub keyboard nudging (arrow keys to step 15 min).
- Per-zone work-hour overrides, overlap finder (separate roadmap items).
- Dragging card markers.
