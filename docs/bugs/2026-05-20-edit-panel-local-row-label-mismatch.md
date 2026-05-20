# Edit-panel local row showed config-seed label, not resolved geo label

- Date: 2026-05-20
- Area: `src/render.js` `buildZoneRow` + `newtab.js` `ctx()`
- Severity: low (UI inconsistency, not a correctness bug)

## Symptom

In the new edit panel, the local row displayed the static `zones[0].label`
from the `config.js` seed (e.g. `"You"`) while the local card on the page
displayed the resolved geo label (e.g. `"Morgan Hill"`). Clicking the local
row to edit prepopulated the input with the stale seed value, not what the
user was actually seeing on the card.

## Root Cause

Two independent sources of truth for the same displayed label:

- `zones[0].label` — seeded from `config.js` ZONES, persisted in
  `localStorage.zones`, never overwritten by the geo cascade.
- `localLabel` — resolved at runtime via `resolveLocalLabel` in `geo.js`,
  drives the local card's `.city` text via `buildModel`.

`buildZoneRow` (introduced in Task 4 of the edit-panel redesign) was using
`z.label` for the panel's display, exposing the decoupling that the
previous UI hid (the homebox edited `home` directly, never showing the
zones store value).

## Trigger Steps

1. With a seeded `zones` list (e.g. `zones[0].label === "You"`) and a
   resolved geo location (e.g. `"Morgan Hill"`), open the edit panel.
2. Observe: card shows `Morgan Hill`, panel local row shows `You`.

## Fix

Expose `localLabel` (the resolved label) via `ctx()`, and use it for the
local row's display in `buildZoneRow`:

```js
label.textContent = z.tz === "local"
  ? (ctx.localLabel || "(detect)")
  : z.label;
```

For the editable input prefill, route through the existing `home` manual-
override key (`ctx.home`, restored to ctx in the same commit) so the input
shows what the user has explicitly set (empty if no override). On blur,
empty value clears `home` and triggers re-detect via the existing
`onRename → onHome → writeHome → refreshGeo` path.

## Verification

- Browser QA (Playwright):
  - Panel local row label matches card label (`"Morgan Hill"` for both).
  - Setting label to `"Steve"` updates both panel and card; persisted in
    `localStorage.homeCity`.
  - Clearing the label re-runs detection; both surfaces return to the
    resolved geo value.
- All 48 unit tests still pass.

## Guardrail

When two surfaces display the same conceptual value, route them through a
single source of truth. The bug existed because `zones[0].label` and the
`home`/`localLabel` cascade were both treated as authoritative for the
"local zone label." Going forward: for the local zone, the cascade in
`geo.js` (`resolveLocalLabel`) is canonical; the panel and card must both
read from it. `zones[0].label` is effectively dead data for the local zone
(it's still in the persisted JSON but never displayed) — a future cleanup
could drop the field entirely.
