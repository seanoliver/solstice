# Bug Journal

Use this directory for non-trivial bugs whose diagnosis will help prevent or shorten a recurrence.

Create an entry when the work uncovered a real failure mechanism, surprising trigger, security boundary, race, integration behavior, or meaningful guardrail. Skip typo-level fixes and failures already explained clearly by an existing entry.

## Naming

`YYYY-MM-DD-short-bug-title.md`

## Required content

Start from `TEMPLATE.md`. Record:

- the observed symptom,
- the actual root cause rather than the proximate error,
- minimal reproduction or trigger conditions,
- the fix,
- verification evidence,
- the recurrence guardrail.

A distinct incident gets a distinct entry. Cross-link an older entry when the same underlying pattern recurs.
