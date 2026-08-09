# Architecture Decision Records

Use ADRs for lasting choices that constrain future implementation and whose rationale is not obvious from the code.

## Naming

`NNNN-short-title.md`, using the next available four-digit number.

## Lifecycle

Start from `TEMPLATE.md`. Valid statuses are `proposed`, `accepted`, `superseded`, and `deprecated`.

Once accepted, preserve the decision as historical evidence. If the choice changes, add a new ADR and mark the old one superseded with a link. Small implementation details and reversible local choices do not need ADRs.
