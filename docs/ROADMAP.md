# Roadmap

Where Solstice is headed, in order. Work status lives in the linked GitHub
issues. This file records the order and the reasons for it. Contributions
welcome.

_Last reviewed: 2026-09-29._

Solstice is built for daily, glance-at-it use in a new tab. The roadmap favors
what makes that glance more useful or calmer.

## Now

1. **Twilight gradient**: soft dawn and dusk edges on the day bands instead
   of hard color switches. [#25](https://github.com/seanoliver/solstice/issues/25)

## Next

2. **Light mode and accent color**: follow the system theme by default, with
   an accent picker in the Edit panel. [#26](https://github.com/seanoliver/solstice/issues/26)
3. **Motion**: transitions on add, remove, and reorder. Zones need in-place
   updates first, because most changes rebuild the markup. [#27](https://github.com/seanoliver/solstice/issues/27)

Pick up the small fixes in [#21](https://github.com/seanoliver/solstice/issues/21),
[#22](https://github.com/seanoliver/solstice/issues/22), and
[#23](https://github.com/seanoliver/solstice/issues/23) when working nearby.

## Later (ideas, not committed)

- **Finding a meeting time**: per-zone work hours ([#11](https://github.com/seanoliver/solstice/issues/11)),
  an overlap finder ([#12](https://github.com/seanoliver/solstice/issues/12)),
  and copying a scrubbed time as text ([#13](https://github.com/seanoliver/solstice/issues/13)).
- **Phone layout** for the website's home page. [#19](https://github.com/seanoliver/solstice/issues/19)
- **Keyboard shortcuts**: `e` edit, `t` 12/24h, `/` focus city search.
- **Shareable moment links on the website**: a URL that shows one instant
  across chosen zones, with no install needed.
- **Publish to Edge**: the MV3 extension should run unchanged; the work is
  mostly the store submission.
- **Settings export/import (JSON)**: move zones between machines.
- **Screenshot tests** (Playwright) to catch visual regressions in CSS.

## Non-goals (for now)

- Cross-machine account sync (export/import covers the real need).
- Calendar integration or event awareness (large scope; a different product).
- A mobile app (Solstice is a new-tab extension by design).

## Shipped

- 2026-09-29: DST heads-up: a zone card shows "−1h in 4d" when its clocks
  change within a week (v1.1.0). [#24](https://github.com/seanoliver/solstice/issues/24)
- 2026-09-28: The website's home page is the new tab itself, customizable
  and saved in the browser, with an Add to Chrome banner.
- 2026-09-28: Website live at https://solstice.seanoliver.dev. [#10](https://github.com/seanoliver/solstice/issues/10)
- 2026-09-28: CI runs extension tests and the website check/build on PRs. [#9](https://github.com/seanoliver/solstice/issues/9)
- 2026-08-09: Astro website (landing and privacy pages).
- 2026-07-08: Local card sun times follow detected location (v1.0.1).
- 2026-06: Published to the Chrome Web Store (v1.0.0).
- 2026-06-05: Timeline scrub: drag any timeline marker to freeze every clock
  at that instant.
- 2026-05-21: 1Hz tick updates only time-derived nodes.
- 2026-05-20: Add, remove, reorder, and rename zones; worldwide city search.
