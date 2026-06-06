# Investigation: pointer capture vs. full-rebuild repaint in timeline scrub

Date: 2026-06-05. Prompted by building the timeline-scrub feature
(`docs/plans/2026-06-05-timeline-scrub.md`).

## Context

Timeline scrub lets you drag any 24-hour timeline marker; the whole UI
freezes at the dragged instant. The first implementation wired the drag
handler (`attachScrub` in `src/render.js`) to call `ctx.onScrub`, which set
`scrubAt` and repainted via `paintLive()` — the existing full-rebuild render
path.

## Key finding

**A full rebuild during an active pointer drag kills the drag after the first
event.** Browser QA (Playwright, real pointer input) showed: `pointerdown`
set the scrub correctly (pill appeared, clock froze), but every subsequent
`pointermove` was a no-op — markers and clock stayed frozen at the
down-position value.

Root cause: `paintLive()` does `liveEl.innerHTML = ""` and rebuilds the
subtree. That destroys (a) the `.strip` element holding pointer capture
(`setPointerCapture`), and (b) the freshly-created `.timeline` element whose
new `attachScrub` closure has `state = null`. So after the first `onScrub`,
pointer events have nowhere to land with live drag state. Capture is
implicitly released when the captured node leaves the DOM.

## How it works now

`onScrub` repaints through a new `paintScrub()` that calls `updateLive()` —
the in-place patch path that mutates time-derived nodes without teardown. The
captured strip and the `attachScrub` listeners survive every move, so the
drag tracks continuously.

`updateLive` was extended to also sync the **scrub chrome** in place: toggle
the `scrubbed` class on the live root (CSS hides the future-dim overlay) and
create / update / remove the `.scrub-pill` via refs (`refs.topRight`,
`refs.scrubPill`). Without this, the in-place path would never show the pill
on the first scrub. `renderLive` still builds the pill for full renders;
`scrubPillEl` / `scrubPillText` are shared so both paths format identically.

Reset (pill click, Esc) still uses `paintLive()` — there's no active drag at
reset time, so a full rebuild is fine and cleanly drops the pill + class.

## Gotchas

- **Don't full-rebuild under a live pointer.** Any future drag interaction
  must repaint in place (`updateLive`), not `paintLive`.
- `updateLive` falls back to `renderLive` when structure changes (zone count,
  solo↔multi, format). During a single drag none of these change, so it stays
  on the in-place path. If a future change can alter structure mid-drag, this
  assumption breaks.
- Scrub is guarded off in edit mode (`if (ctx.editMode) return` in
  `attachScrub` pointerdown) — the edit panel owns the timeline then.
- QA red herring: tall pages put lower timeline rows below the default
  Playwright viewport (720px-ish), so synthetic mouse input silently misses
  them. Resize the viewport (e.g. 1400×1300) before driving drags on lower
  rows, or the feature looks broken when it isn't.

## References

- `src/render.js` — `attachScrub`, `scrubPillEl`/`scrubPillText`, `updateLive`
  scrub-chrome block.
- `newtab.js` — `scrubAt`, `paintScrub`, `onScrub`/`onResetScrub`, Esc handler.
- `src/timeModel.js` — `scrubToInstant` (pure pct→instant mapping).
- Plan: `docs/plans/2026-06-05-timeline-scrub.md`.
