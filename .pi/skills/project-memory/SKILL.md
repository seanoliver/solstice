---
name: project-memory
description: Capture and maintain durable engineering knowledge in this repository. Use when a non-trivial bug is resolved, an investigation concludes, a lasting architectural decision is made, a reusable operating procedure emerges, or the user asks to remember/document/capture project knowledge.
---

# Project Memory

Read `docs/README.md` before writing. Treat code, tests, configuration, and the issue tracker as more authoritative than memory documents.

## Route the knowledge

Choose exactly one primary home:

- `docs/bugs/`: a diagnosed failure, its root cause, fix, verification, and recurrence guardrail.
- `docs/investigations/`: reusable understanding of how a system behaves.
- `docs/adr/`: a lasting decision, its context, alternatives, and consequences.
- `docs/runbooks/`: repeatable operational steps with verification and recovery.
- `docs/plans/`: temporary implementation intent. Plans are not evidence of current behavior.

Do not copy the same explanation into multiple documents. Cross-link instead.

## Workflow

1. Search the relevant memory directories for an existing entry on the same topic.
2. Verify important claims against current source files, tests, configuration, commands, PRs, or issues.
3. Update an existing entry when it owns the same topic. Create a new dated entry only for a distinct incident or investigation.
4. Start from the destination directory's `TEMPLATE.md` and follow its `README.md`.
5. Lead with conclusions. Include concrete paths, symbols, commands, and evidence, but avoid brittle line numbers.
6. Record freshness metadata. Use the current commit SHA when the document was verified against repository state.
7. Cross-link related documents rather than repeating them.
8. Keep transient task status and ownership in GitHub issues/PRs, not durable memory.

## Quality bar

A useful memory entry changes future behavior. It should answer at least one of:

- What should a future agent read before touching this area?
- What surprising mechanism would otherwise be rediscovered?
- What invariant or test prevents recurrence?
- Why was this choice made over the alternatives?
- How can this operation be repeated and proven successful?

Skip trivial fixes, speculative notes, conversation summaries, and facts obvious from nearby code.

## Completion behavior

If the user explicitly asks to capture knowledge, write the entry. Otherwise, at a natural completion point for non-trivial work, briefly propose the document and wait for approval. State the proposed path and 2–4 bullets of what it would preserve.
