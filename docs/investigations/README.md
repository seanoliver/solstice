# Investigations

Use this directory for verified, reusable understanding of how a subsystem, dependency, integration, or cross-cutting flow behaves.

An investigation should answer a question future work is likely to ask again. It is not a scratchpad or a transcript. Lead with conclusions, distinguish observation from inference, and cite current source paths, symbols, tests, commits, and primary documentation.

## Naming

`YYYY-MM-DD-short-topic.md`

## Lifecycle

Start from `TEMPLATE.md`. Search before creating a file:

- Update the existing entry when it owns the same topic and the new work re-verifies or extends it.
- Create a new entry for a materially different question or a historical snapshot that must remain distinct.
- Mark an entry stale or superseded when its mechanism no longer reflects current behavior.

Avoid brittle line-number references. Link to related bug entries, ADRs, runbooks, issues, and PRs rather than duplicating their content.
