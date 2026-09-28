# ADR-0002: The website imports the extension's modules directly

**Date:** 2026-09-28
**Status:** Accepted
**Decision owners:** Sean Oliver
**Related:** `docs/adr/0001-astro-for-the-website.md`, `web/src/components/LiveDemo.astro`

## Context

The landing page now embeds a live demo of the new tab: the visitor's time, zone cards, and the draggable daylight timeline. ADR-0001 said not to extract shared code until both surfaces consume it. The demo is that consumer: it needs the same time model, sunrise/sunset math, day-part bands, and city dataset as the extension.

## Decision

`web/` imports the extension's plain ES modules straight from the repository root (`src/timeModel.js`, `src/dayPart.js`, `cities.js`, and what they import) by relative path. Vite bundles them into the website's build. There is no shared package and no copy.

The demo does not reuse `src/render.js` or `newtab.js`. Those files are the extension's DOM and storage wiring; the demo has its own small renderer.

## Alternatives considered

### A shared package (pnpm workspace)

It would make the dependency explicit, but the extension has no build step and no `package.json`. Adding workspace tooling to the root for one import path costs more than it saves.

### Copy the modules into `web/`

Copies drift. The demo's reason to exist is showing the extension's real behavior, so a drifted copy would be wrong in a way nobody notices.

## Consequences

### Positive

- The demo computes times and daylight with exactly the extension's code.
- The extension stays no-build; nothing in the root changes.

### Negative

- Changes to those modules now affect the website. Run `pnpm check` and `pnpm build` in `web/` as well as `node --test` (CI runs both).
- The modules are untyped JS. `LiveDemo.astro` declares the shape it relies on from `buildModel`; keep it in step with `src/timeModel.js`.
- `web/astro.config.mjs` allows the dev server to read `..`, and Vercel must keep "include files outside the root directory" enabled (it is by default).

## Verification

- `web/src/components/LiveDemo.astro` imports from `../../../src/` and `../../../cities.js`.
- `pnpm build` in `web/` succeeds with no copies of those files under `web/`.
