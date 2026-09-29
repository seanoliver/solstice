# Roadmap

Where Solstice is headed, in order. Work status lives in the linked GitHub
issues. This file records the order and the reasons for it. Contributions
welcome.

_Last reviewed: 2026-09-28._

## Now

Nothing in progress. Pick the next item from Next.

## Next — finding a meeting time

This builds on timeline scrub. The goal is to answer "when can we all talk?"
without mental math.

1. **Per-zone work hours** — replace the hardcoded 9–5 in `src/dayPart.js`
   and `src/bands.js`. The overlap finder needs it. [#11](https://github.com/seanoliver/solstice/issues/11)
2. **Overlap finder** — highlight the hours when every selected zone is at
   work. [#12](https://github.com/seanoliver/solstice/issues/12)
3. **Copy a scrubbed time** — one click copies "3pm SF / 6pm NY / 11pm
   London" for a message. [#13](https://github.com/seanoliver/solstice/issues/13)

## Later — ideas, not committed

- **DST warnings** — a small chip on a zone when its clocks change within a
  few days ("London changes clocks in 4 days").
- **Keyboard shortcuts** — `e` edit, `t` 12/24h, `/` focus city search.
- **Light mode** and an optional accent color. The palette is centralized in
  `src/dayPart.js` and the CSS variables.
- **Shareable moment links on the website** — a URL that shows one instant
  across chosen zones, with no install needed. This is the first tool for the
  website's web app (see `CONTEXT.md`).
- **Publish to Edge** — the MV3 extension should run unchanged; the work is
  mostly the store submission.
- **Settings export/import (JSON)** — move zones between machines.
- **Twilight gradient** — soft civil-twilight edges instead of hard band
  boundaries.
- **Transitions** on add, remove, and reorder.
- **Screenshot tests** (Playwright) to catch visual regressions in CSS.

## Non-goals (for now)

- Cross-machine account sync (export/import covers the real need).
- Calendar integration or event awareness (large scope; a different product).
- A mobile app (Solstice is a new-tab extension by design).

## Shipped

- 2026-09-28 — The website's home page is the new tab itself, customizable
  and saved in the browser, with an Add to Chrome banner.
- 2026-09-28 — Website live at https://solstice.seanoliver.dev. [#10](https://github.com/seanoliver/solstice/issues/10)
- 2026-09-28 — CI runs extension tests and the website check/build on PRs. [#9](https://github.com/seanoliver/solstice/issues/9)
- 2026-08-09 — Astro website (landing and privacy pages).
- 2026-07-08 — Local card sun times follow detected location (v1.0.1).
- 2026-06 — Published to the Chrome Web Store (v1.0.0).
- 2026-06-05 — Timeline scrub: drag any timeline marker to freeze every clock
  at that instant.
- 2026-05-21 — 1Hz tick updates only time-derived nodes.
- 2026-05-20 — Add, remove, reorder, and rename zones; worldwide city search.
