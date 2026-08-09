# Project Memory

This directory is the repository's durable engineering memory. Its purpose is to make verified lessons easy to retrieve without turning documentation into a second, stale source of truth.

## Trust hierarchy

When sources disagree, prefer them in this order:

1. Current code, tests, migrations, and configuration
2. Current GitHub issues and pull requests for work state
3. Accepted ADRs for decision rationale
4. Runbooks, investigations, and bug journals
5. Plans and conversation/session history

Memory documents are evidence. Verify consequential or old claims against authoritative sources before acting.

## Where knowledge belongs

| Knowledge                                  | Primary home           | Lifecycle                                                  |
| ------------------------------------------ | ---------------------- | ---------------------------------------------------------- |
| Domain language and invariants             | `CONTEXT.md`           | Updated as the shared language changes                     |
| Lasting architectural choice               | `docs/adr/`            | Immutable after acceptance; supersede with another ADR     |
| Diagnosed failure and recurrence guardrail | `docs/bugs/`           | One entry per non-trivial incident or bug cluster          |
| Reusable understanding of system behavior  | `docs/investigations/` | Update when the same topic is re-verified                  |
| Repeatable operational procedure           | `docs/runbooks/`       | Updated in place and periodically re-verified              |
| Proposed implementation                    | `docs/plans/`          | Temporary intent; mark completed, superseded, or abandoned |
| Work status, ownership, and next actions   | GitHub issue or PR     | Keep out of durable docs                                   |
| Conversation continuity                    | Pi session             | Use `pi -c`, `/resume`, `/tree`, and `/compact`            |

Choose one primary home for a fact and cross-link related entries. Do not repeat the same explanation across several documents.

## Pi integration

The repository uses Pi's native layers instead of maintaining a parallel transcript log:

- `AGENTS.md` contains the small set of instructions worth loading every turn.
- `.pi/extensions/project-memory.ts` scores the current prompt against durable memory and adds only matching paths to that turn's system prompt.
- `.pi/skills/project-memory/SKILL.md` contains the full capture workflow and loads on demand.
- `/memory <topic>` searches existing memory before fresh investigation.
- `/capture-memory [kind] [topic]` records a verified lesson using the project-memory skill.
- Pi's JSONL sessions provide short-term continuity and branching. Session summaries are not copied into this repository.

After adding or changing `.pi` resources during a running session, use `/reload`. Project-local extensions and skills require the repository to be trusted.

## Reading workflow

Before changing an unfamiliar area:

1. Read `CONTEXT.md` for domain vocabulary.
2. Read accepted ADRs that constrain the area.
3. Read any paths surfaced by the project-memory extension that are genuinely relevant.
4. Verify stale or consequential claims against current code and tests.
5. Investigate from scratch only where existing memory leaves a real gap.

Plans describe what someone intended to build. Never infer current behavior from a plan alone.

## Writing workflow

Capture only knowledge likely to save future investigation or prevent a repeated mistake. A good entry includes concrete evidence, relevant paths and symbols, and enough verification to distinguish fact from hypothesis.

- Use the destination directory's `TEMPLATE.md` and `README.md`.
- Bugs, investigations, and plans use `YYYY-MM-DD-short-title.md`.
- ADRs use `NNNN-short-title.md`.
- Runbooks use a stable `short-task.md` filename and are updated in place.
- Prefer paths and symbol names over brittle line numbers.
- Include a commit SHA in `Last verified` when claims were checked against repository state.
- Never include secrets, raw tokens, private contact data, or production credentials.

Do not create entries for trivial fixes, speculative ideas, or facts obvious from nearby code.

## Freshness and maintenance

Each durable entry carries a status and verification point. Stale does not mean false; it means "verify before relying on this."

- Update an investigation or runbook when rechecking the same topic.
- Create a new bug entry for a distinct incident, even if it links to an older root-cause pattern.
- Supersede accepted ADRs rather than rewriting their history.
- Mark plans completed, superseded, or abandoned when their lifecycle ends.
- Delete accidental duplication; preserve meaningful decision history through links and statuses.
