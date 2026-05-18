# PM zones classified/plotted as AM

- Date: 2026-05-18
- Area: `src/timeModel.js` → `zoneNow`
- Severity: high (core correctness — wrong band + wrong timeline position for every afternoon/evening zone)

## Symptom

At 11:15 AM Pacific, London (19:15 local) displayed the correct time string
"7:15 PM" but was classified in the **Morning** band and its timeline marker
sat in the AM half of the 24h bar. Every zone whose local time was PM showed
the same: correct `label2` text, wrong band/marker.

## Root Cause

`zoneNow` built the `formatToParts` formatter by spreading an options object
that contained `hour12: true` and then adding `hourCycle: "h23"`:

```js
const opts = { hour: "numeric", minute: "2-digit", hour12: true };
const parts = new Intl.DateTimeFormat("en-US", { ...opts, hourCycle: "h23" })
  .formatToParts(at);
```

Per the ECMAScript Internationalization spec, when both are present
**`hour12` overrides `hourCycle`**. So `formatToParts` returned the
*12-hour* hour ("7" for 19:15), and `Number(get("hour"))` produced `7`
instead of `19`. Downstream, `minutesOfDay = hour*60+minute` became
`7*60+15 = 435` instead of `1155`, so `partOfDay` and the timeline
position treated a PM instant as AM. The `label` string was unaffected
because it used the original `opts` (hour12, no hourCycle), so the visible
time text stayed correct — which masked the bug.

## Trigger Steps

1. Be in any zone where another configured zone's local time is PM.
2. Observe a PM zone (e.g. London at 19:15): time text correct, but band =
   Morning and timeline dot in the AM region.

## Fix

Build two independent formatters in `zoneNow`: the numeric one uses
`hourCycle: "h23"` and **no `hour12`**; the display one uses
`hour12: true` separately.

```js
const parts = new Intl.DateTimeFormat("en-US",
  { ...base, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
  .formatToParts(at);
...
label: new Intl.DateTimeFormat("en-US",
  { ...base, hour: "numeric", minute: "2-digit", hour12: true }).format(at)
```

## Verification

- New regression tests in `test/timeModel.test.js`:
  - `zoneNow.hour is 24-hour for a PM instant` — London 18:15Z → hour 19.
  - `buildModel classifies a PM zone correctly` — minutesOfDay 1155, part `evening`.
- Full suite: 14/14 pass (`node --test`).
- Live `buildModel`: London 19:16 → `evening`, Berlin 20:16 → `evening`,
  Sydney 04:16 → `night`. Correct.

## Guardrail

The regression tests deliberately sample a PM instant where 12-hour ≠
24-hour (the original test only sampled noon, where 12 == 12, so it never
caught this). Rule: any test of `zoneNow`/`buildModel` hour math must use a
non-noon, non-AM instant. Never combine `hour12` and `hourCycle` in one
`Intl.DateTimeFormat` options object.
