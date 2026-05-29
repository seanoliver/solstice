# Roadmap

Ideas for where this could go. Nothing here is committed work — it's a
menu, roughly prioritized. Contributions welcome.

## Next up (my pick for highest value)

1. **Meeting / overlap finder** — pick a subset of zones, highlight the
   hours where they're all in the `work` band. The killer feature for a
   world clock; uniquely useful.
2. ~~**Drag-to-reorder zones** — the obvious companion to add/remove.~~ Shipped 2026-05-20.
3. **Publish readiness** — store assets + privacy page (see checklist
   below). Unblocks shipping to the Chrome Web Store.

## Features

- **Meeting / overlap finder** — common working-hours across selected zones.
- ~~**Drag-to-reorder zones** in edit mode (persist order in `localStorage`).~~ Shipped 2026-05-20.
- **Timeline scrub** — drag a playhead to ask "when it's 3pm here, what
  time is it everywhere?" Pairs naturally with the existing timeline.
- **Per-zone work hours** — override the fixed 9–5 per zone (some people
  want 8–4, split shifts, etc.). Currently hardcoded in `dayPart.js`.
- **Click a card to copy** a formatted string ("3:02 PM SF / 11:02 PM
  London") for async messages.
- **Settings export/import (JSON)** — move config between machines without
  needing cross-machine sync.

## Polish / UX

- **Light mode** + optional accent picker. Palette is centralized in
  `dayPart.js` / CSS vars, so this is cheap.
- **Subtle transitions** on add/remove/reorder (currently hard cuts).
- **Keyboard shortcuts** — `e` edit, `t` 12/24h, `/` focus add-city.
- **Twilight gradient** — soft civil-twilight edges instead of hard band
  boundaries (the original visual ambition, dropped for simplicity).

## Technical / quality

- **E2E / screenshot test** (Playwright) — guards against visual
  regressions; there's been a lot of CSS iteration done blind.
- **Backfill bug/investigation journals** in `docs/bugs/` (only the
  AM/PM-as-night entry exists; the `letter-spacing` and `hour12`/
  `hourCycle` fixes are worth recording for an OSS repo).
- **CI** — run `node --test` on PRs.
- **Local-zone sun bands track geolocation** — currently the geo cascade
  (`src/geo.js`) only overrides the local card's *label*. Its `lat`/`lon`
  for the sunrise/sunset computation come from `config.js` and never
  update, so a user far from the seed coords sees the wrong sun bands on
  the local card. Should plumb resolved geolocation coords into the local
  row's `sunTimesUTC` call in `buildModel`.
- ~~**Reduce reflow** — `renderLive` rebuilds the whole DOM every second;
  fine today, but a diff/update path would be tidier if features grow.~~
  Shipped 2026-05-21: the 1Hz tick now patches only time-derived nodes in
  place (`updateLive`); full rebuild only on structural changes.

## Publish to Chrome Web Store — checklist

- [x] Icons: 16 / 32 / 48 / 128 px in `assets/icons/`, wired via `icons` in
      `manifest.json`. (No `action` — pure new-tab override, a toolbar
      button would do nothing.)
- [ ] Store listing: name, short + long description, category, 1280×800
      screenshots, small promo tile.
- [ ] **Privacy policy** page/URL. The extension uses `geolocation` and
      calls BigDataCloud + IP providers — Web Store review requires
      disclosure of what's collected (nothing is stored remotely; location
      is used only to label the local card and cached locally). State that
      plainly.
- [ ] First-run UX: consider a one-time "add your cities" prompt and a
      heads-up before the location permission prompt. (Neutral default
      zone set already shipped.)
- [ ] Manifest hygiene: bump `version`, add `homepage_url`, author.
- [x] `LICENSE` — MIT.
- [ ] Repo: `README` install-from-source section, `CONTRIBUTING` note,
      screenshot in README.
- [x] Remove anything personal from default `config.js` — neutral set
      (Local + New York + London + Tokyo).

## Non-goals (for now)

- Cross-machine account sync (export/import covers the real need).
- Calendar integration / event awareness (large scope; different product).
- Mobile app (this is a new-tab extension by design).
