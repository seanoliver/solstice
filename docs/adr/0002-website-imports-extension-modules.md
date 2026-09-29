# ADR-0002: The website's home page runs the extension's new tab

**Date:** 2026-09-28
**Status:** Accepted
**Decision owners:** Sean Oliver
**Related:** `docs/adr/0001-astro-for-the-website.md`, `web/src/pages/index.astro`

## Context

The website's home page should be Solstice itself: the same new tab, customizable, with an Add to Chrome call to action. It must look identical to the extension. The extension already runs on plain web APIs (`localStorage`, `fetch`, `navigator.geolocation`) and uses no `chrome.*` API, so its new tab works as an ordinary web page.

## Decision

`web/src/pages/index.astro` imports the extension's `newtab.css` and `newtab.js` from the repository root by relative path. Vite bundles them, and everything they import, into the website's build. There is no shared package and no copy.

The website adds only three things around the extension's code:

- The Add to Chrome banner and top-bar button (`web/src/scripts/cta.ts`, `web/src/styles/cta.css`).
- A Privacy link beside the extension's GitHub link (`web/src/scripts/footer.ts`).
- A `data-no-detect` attribute on `<html>`. `newtab.js` reads it and skips location detection, so the website never shows a location prompt or makes an IP lookup on load.

Settings are saved in the website's own `localStorage`, using the extension's keys. They are separate from the extension's storage.

## Alternatives considered

### Rebuild the new tab as Astro components

It would drift from the extension, and "identical" would become a maintenance job.

### Copy the extension files into `web/` at build time

It works, but it needs a copy step and a second path for the dev server. Importing gives the same result with no extra tooling.

### Store settings in a cookie

Cookies are sent to the server on every request and are limited to about 4 KB. The server has no use for them, and the extension's code already uses `localStorage`.

## Consequences

### Positive

- The home page is pixel-identical to the extension, because it is the same code.
- The extension stays no-build.

### Negative

- Changes to the extension's new tab now change the website. Run `pnpm check` and `pnpm build` in `web/` as well as `node --test` (CI runs both).
- The extension's layout is not built for phones, so neither is the home page.
- `web/astro.config.mjs` allows the dev server to read `..`, and Vercel must keep "include files outside the root directory" enabled (it is by default).

## Verification

- `web/src/pages/index.astro` imports `../../../newtab.css` and `../../../newtab.js`.
- `pnpm build` in `web/` succeeds with no copies of those files under `web/`.
