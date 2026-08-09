# Repository Guidelines for Agents

## Project shape

Solstice has two independently shipped surfaces:

- The repository root is a no-build Chrome new-tab extension written in vanilla ES modules.
- `web/` is the Astro website. Keep its dependencies and build output isolated from the extension.

Run extension tests with `node --test`. Run website commands from `web/` with `pnpm dev`, `pnpm check`, and `pnpm build`.

When extension storage, location, permissions, or network behavior changes, review `PRIVACY.md`, the README privacy summary, `docs/chrome-web-store-listing.md`, and `web/src/pages/privacy.astro` in the same change.

## Project memory

Read `docs/README.md` before investigating an unfamiliar area or capturing project knowledge. Use `CONTEXT.md` for domain vocabulary and read relevant accepted ADRs before making architectural changes.

Treat code, tests, configuration, and the issue tracker as authoritative. Documents under `docs/bugs/`, `docs/investigations/`, and `docs/runbooks/` are evidence that may need re-verification; `docs/plans/` records intent only.

When a non-trivial bug, investigation, decision, or operational procedure should be preserved, load the `project-memory` skill. Route the lesson to one primary document and cross-link instead of duplicating it. Use Pi sessions (`pi -c`, `/resume`, `/tree`, `/compact`) for conversation continuity rather than writing session transcripts into the repository.
