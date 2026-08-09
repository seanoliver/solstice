# Astro landing page

**Date:** 2026-08-09
**Status:** Completed
**Issue:** None
**Result:** Implemented in the 2026-08-09 working tree; awaiting commit

## Goal

Add a lightweight public website that explains Solstice, tours its core features, answers common questions, and sends visitors to the Chrome Web Store.

## Constraints

- Preserve the root extension's no-build development and packaging flow.
- Match the extension's calm dark visual language without copying its application layout wholesale.
- Produce useful static HTML with no client JavaScript required.
- Use the existing icon, screenshots, store listing copy, and privacy claims.
- Keep future interactive tools possible without extracting hypothetical shared modules now.
- Follow `docs/adr/0001-astro-for-the-website.md`.

## Approach

Create an isolated Astro project in `web/`. Build one responsive landing route and one hosted privacy route, with a shared layout and global design tokens. Copy release assets into `web/public/` because the extension and static website are independently packaged outputs.

## Steps

1. Scaffold the Astro project and shared page layout.
2. Build the hero, feature tour, privacy section, FAQ, and install calls to action.
3. Add a hosted privacy route and responsive styling.
4. Verify Astro checks/build, extension tests, and generated output.
5. Document the project commands and mark this plan complete.

## Verification

- `pnpm check` and `pnpm build` pass in `web/`.
- `node --test` passes at the repository root.
- The built landing page contains working Chrome Web Store, GitHub, FAQ, feature-tour, and privacy links.
- The page remains legible at narrow and wide viewport widths.

## Risks and open questions

- The production domain and hosting provider are not selected, so canonical URLs and deployment configuration remain deferred.
- Browser support beyond modern evergreen browsers has not yet been specified.

## Completion notes

The landing and privacy routes build as static HTML with no generated JavaScript. Browser QA at 1440 px and 390 px found no horizontal overflow; both routes returned successfully, and the existing extension test suite remained green.
