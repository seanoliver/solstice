# Plans

Plans capture temporary implementation intent. They are useful working artifacts, but they are the least authoritative repository memory: code, tests, configuration, issues, and PRs determine what actually exists.

## Naming

`YYYY-MM-DD-short-topic.md`

## Lifecycle

Start from `TEMPLATE.md` and keep `Status` current:

- `draft`
- `approved`
- `in-progress`
- `completed`
- `superseded`
- `abandoned`

When implementation finishes, mark the plan completed and link the resulting PR or commit. Put reusable discoveries in an investigation, lasting choices in an ADR, and diagnosed failures in the bug journal instead of expanding the plan into permanent catch-all documentation.
