# ADR-0001: Use Astro for the website

**Date:** 2026-08-09
**Status:** Accepted
**Decision owners:** Sean Oliver
**Related:** `docs/plans/2026-08-09-astro-landing-page.md`. See ADR-0002 for how the home page now reuses the extension's new tab.

## Context

Solstice needs a fast, search-friendly landing page now and may later add interactive time-and-daylight tools. The Chrome extension is a no-build vanilla JavaScript project and must remain independently packageable.

## Decision

Build the website as an Astro project under `web/`. Generate static HTML by default and add client-side islands only where interaction earns its runtime cost. Keep the extension at the repository root and do not extract shared code until both surfaces actually consume it.

## Alternatives considered

### Next.js

Next.js provides a strong full-stack React platform, but React, server/client component rules, and application hosting add complexity that the initial static website does not need.

### SvelteKit

SvelteKit is a strong candidate for a highly interactive Solstice web app. It was not chosen because the first release is content-first; Astro can still host Svelte islands if an interactive feature benefits from Svelte later.

### Handwritten static HTML

Static HTML would match the first release but would make layouts, metadata, repeated sections, and future routes progressively harder to maintain.

## Consequences

### Positive

- The landing page ships as static HTML with no client JavaScript by default.
- Website dependencies and deployment stay isolated in `web/`.
- Interactive features can be introduced incrementally as islands.

### Negative

- Contributors must learn Astro's component syntax and build tooling.
- If the website becomes a single, deeply interactive application, its application routes may eventually fit SvelteKit better.
- Assets used by both independently shipped surfaces are copied until a real shared-asset seam is justified.

## Verification

- `web/package.json` uses Astro.
- `pnpm build` in `web/` produces static output.
- The extension still passes `node --test` and packages without website files.
