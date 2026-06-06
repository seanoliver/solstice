# Timeline Scrub Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Let the user drag any 24-hour timeline marker to a new time and freeze the entire UI (all timelines, all cards, the big local clock) at that absolute instant, with a "Now" pill and Escape to return to live.

**Architecture:** The UI is already a pure function of one timestamp via `buildModel(zones, at, localLabel)`. Introduce a single nullable `scrubAt` instant in `newtab.js`; when set, every render uses it instead of `new Date()` and the 1Hz tick freezes. A pure `scrubToInstant(base, tz, pct)` maps a dragged position to that instant. A pointer-capture handler on the tall timeline strips drives it.

**Tech Stack:** Vanilla ES modules, `node:test` for unit tests (`node --test test/<file>.test.js`), no build step. Manual browser QA by loading the unpacked extension / opening `newtab.html`.

**Reference:** Design doc `docs/plans/2026-06-05-timeline-scrub-design.md`.

---

### Task 1: `minutesInZone` export + `scrubToInstant` mapping

**Files:**
- Modify: `src/timeModel.js` (export `minutesInZone`; add `scrubToInstant`)
- Test: `test/timeModel.test.js`

**Step 1: Write the failing tests**

Append to `test/timeModel.test.js`. Update the import line at the top to add
`minutesInZone, scrubToInstant`.

```js
test("scrubToInstant snaps to the nearest 15 minutes in the dragged zone", () => {
  // base instant is arbitrary; pct 0.5 → 12:00 noon target in the zone.
  const base = new Date("2026-06-05T12:00:00Z");
  const tz = "UTC";
  const t = scrubToInstant(base, tz, 0.5);
  assert.equal(minutesInZone(t, tz), 12 * 60); // 720 min = 12:00

  // pct that lands on 03:07 should snap back to 03:00 (nearest quarter).
  const t2 = scrubToInstant(base, tz, (3 * 60 + 7) / 1440);
  assert.equal(minutesInZone(t2, tz), 3 * 60);

  // pct that lands on 03:08 should snap up to 03:15.
  const t3 = scrubToInstant(base, tz, (3 * 60 + 8) / 1440);
  assert.equal(minutesInZone(t3, tz), 3 * 60 + 15);
});

test("scrubToInstant is exact for a half-hour-offset zone", () => {
  const base = new Date("2026-06-05T06:00:00Z");
  const tz = "Asia/Kolkata"; // UTC+5:30
  const t = scrubToInstant(base, tz, (9 * 60 + 30) / 1440); // target 09:30 IST
  assert.equal(minutesInZone(t, tz), 9 * 60 + 30);
});

test("scrubToInstant lands on the target across a DST transition day", () => {
  // US DST began 2026-03-08. Anchor on that day, drag to 09:00 local.
  const base = new Date("2026-03-08T20:00:00Z");
  const tz = "America/Los_Angeles";
  const t = scrubToInstant(base, tz, (9 * 60) / 1440);
  assert.equal(minutesInZone(t, tz), 9 * 60);
});

test("scrubToInstant clamps pct to the last quarter (23:45)", () => {
  const base = new Date("2026-06-05T00:00:00Z");
  assert.equal(minutesInZone(scrubToInstant(base, "UTC", 1), "UTC"), 23 * 60 + 45);
});
```

**Step 2: Run tests to verify they fail**

Run: `node --test test/timeModel.test.js`
Expected: FAIL — `scrubToInstant is not a function` / `minutesInZone` import undefined.

**Step 3: Implement**

In `src/timeModel.js`, change `function minutesInZone(` to
`export function minutesInZone(`. Then add at the end of the file:

```js
// Map a dragged timeline position (pct 0..1) to the absolute instant at which
// `tz` reads that time-of-day, snapped to the nearest 15 minutes. `base` is the
// day anchor (current scrub instant or now); the dragged zone stays on `base`'s
// calendar day. A single correction pass absorbs DST / half-hour offsets.
export function scrubToInstant(base, tz, pct) {
  const clamped = Math.min(1, Math.max(0, pct));
  const m = Math.min(1425, Math.round((clamped * 1440) / 15) * 15); // ≤ 23:45
  const mCur = minutesInZone(base, tz);
  let t = base.getTime() + (m - mCur) * 60000;
  t += (m - minutesInZone(new Date(t), tz)) * 60000;
  return new Date(t);
}
```

Note: `1425` is 23:45 in minutes (the last snap slot), so `pct === 1` clamps to 23:45 rather than rolling into the next day.

**Step 4: Run tests to verify they pass**

Run: `node --test test/timeModel.test.js`
Expected: PASS (all suites, including the 4 new tests).

**Step 5: Commit**

```bash
git add src/timeModel.js test/timeModel.test.js
git commit -m "feat(scrub): pure scrubToInstant mapping + minutesInZone export"
```

---

### Task 2: Scrub state + freeze + reset wiring in `newtab.js`

**Files:**
- Modify: `newtab.js`

No unit test (DOM glue / `localStorage` not involved); verified via Task 5 browser QA.

**Step 1: Import the mapping**

Modify the timeModel import at `newtab.js:1`:

```js
import { buildModel, scrubToInstant } from "./src/timeModel.js";
```

**Step 2: Add scrub state**

After `let timeFmt = ...` (around `newtab.js:46`) add:

```js
let scrubAt = null; // null = live; a Date = frozen at that instant
```

**Step 3: Use scrubAt in every render path**

- In `paintLive()` change `const now = new Date();` to
  `const now = scrubAt ?? new Date();`
- In `tick()` add a guard as the first line: `if (scrubAt) return;` (frozen →
  no live updates). Leave the rest unchanged.

**Step 4: Add ctx fields**

Inside the object returned by `ctx()`, add `scrubAt,` near `localLabel,` and add
two handlers (place beside `onReorder`):

```js
onScrub(zoneIdx, pct) {
  const z = zones[zoneIdx];
  if (!z) return;
  const base = scrubAt ?? new Date();
  scrubAt = scrubToInstant(base, z.tz, pct);
  paintLive();
},
onResetScrub() {
  if (scrubAt === null) return;
  scrubAt = null;
  paintLive();
},
```

**Step 5: Escape-to-reset**

After the `setInterval(tick, 1000);` line (around `newtab.js:132`) add:

```js
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && scrubAt) { scrubAt = null; paintLive(); }
});
```

**Step 6: Commit**

```bash
git add newtab.js
git commit -m "feat(scrub): scrubAt state, frozen tick, reset handlers"
```

---

### Task 3: Drag handler + scrubbed-state render in `render.js`

**Files:**
- Modify: `src/render.js`

**Step 1: Render the scrubbed pill and `scrubbed` class**

In `renderLive`, after `liveEl.className = "live wt";` (around `render.js:394`)
append the scrubbed flag:

```js
if (ctx && ctx.scrubAt) liveEl.className += " scrubbed";
```

In the topbar block, after `right.append(today, fmt);` add the pill (only when
scrubbed). Build it before the append and include it conditionally:

```js
if (ctx && ctx.scrubAt) {
  const local = model.find((r) => r.tz === "local") || model[0];
  const pt = formatHM(local.hour, local.minute, mode);
  const pill = document.createElement("button");
  pill.className = "scrub-pill";
  pill.title = "Return to live time (Esc)";
  const off = local.dayOffset
    ? ` ${local.dayOffset > 0 ? "+" : "−"}${Math.abs(local.dayOffset)}` : "";
  pill.innerHTML =
    `<span class="sp-time">⏸ ${pt.hm}${pt.ap ? " " + pt.ap : ""}${off}</span>` +
    `<span class="sp-reset">Now</span>`;
  pill.addEventListener("click", () => ctx.onResetScrub());
  right.append(pill);
}
```

(`local` may already be declared above in `renderLive`; if so, reuse it and
drop the re-declaration to avoid a `const` redeclare error.)

**Step 2: Attach the scrub drag handler**

In the timeline section (`if (model.length > 1) { ... }`), after the
`for (const r of model)` loop that appends rows and before
`liveEl.appendChild(tl);`, add:

```js
attachScrub(tl, ctx);
```

Then add the handler function near `attachDrag` (mirror its structure):

```js
function attachScrub(timelineEl, ctx) {
  let state = null;
  const pctFromEvent = (strip, clientX) => {
    const rect = strip.getBoundingClientRect();
    return (clientX - rect.left) / rect.width; // onScrub clamps
  };

  timelineEl.addEventListener("pointerdown", (e) => {
    if (state) return;
    const strip = e.target.closest(".strip");
    if (!strip) return;
    const rows = Array.from(timelineEl.querySelectorAll(".tlrow"));
    const row = strip.closest(".tlrow");
    const idx = rows.indexOf(row);
    if (idx < 0) return;
    e.preventDefault();
    strip.setPointerCapture(e.pointerId);
    state = { pointerId: e.pointerId, strip, idx };
    ctx.onScrub(idx, pctFromEvent(strip, e.clientX));
  });

  timelineEl.addEventListener("pointermove", (e) => {
    if (!state || e.pointerId !== state.pointerId) return;
    ctx.onScrub(state.idx, pctFromEvent(state.strip, e.clientX));
  });

  const finish = (e) => {
    if (!state || e.pointerId !== state.pointerId) return;
    state = null; // freeze: scrubAt already holds the last instant
  };
  timelineEl.addEventListener("pointerup", finish);
  timelineEl.addEventListener("pointercancel", finish);
}
```

Caveat: `paintLive()` rebuilds the timeline subtree on every `onScrub`, which
destroys the element that holds pointer capture. To keep the drag alive,
re-capture is unnecessary because pointer events still fire on the document
while a button is held; but to be safe, the handler reads the *current* strip
from `state.strip` only for geometry — if a regression appears mid-drag, switch
`onScrub` to repaint via `updateLive` instead of `paintLive`. Verify in Task 5.

**Step 3: Run the unit suite (no regressions)**

Run: `node --test test/*.test.js`
Expected: PASS (render.js has no unit tests; this confirms nothing else broke).

**Step 4: Commit**

```bash
git add src/render.js
git commit -m "feat(scrub): timeline drag handler + scrubbed pill"
```

---

### Task 4: CSS for the pill + hide future overlay when scrubbed

**Files:**
- Modify: the stylesheet linked from `newtab.html` (confirm filename — likely
  `newtab.css` or a `styles/` file; `grep -n "stylesheet" newtab.html`).

**Step 1: Find the stylesheet**

Run: `grep -n "stylesheet\|\.css" newtab.html`

**Step 2: Add styles**

Append (match existing palette/variables — reuse the teal accent and card
border tokens already defined):

```css
.scrub-pill {
  display: inline-flex; align-items: center; gap: 8px;
  font: inherit; cursor: pointer;
  padding: 4px 10px; border-radius: 999px;
  border: 1px solid var(--accent, #4cc2c4);
  background: color-mix(in srgb, var(--accent, #4cc2c4) 14%, transparent);
  color: var(--accent, #4cc2c4);
}
.scrub-pill .sp-reset {
  font-size: 0.85em; opacity: 0.8;
  border-left: 1px solid currentColor; padding-left: 8px;
}
.scrub-pill:hover { background: color-mix(in srgb, var(--accent, #4cc2c4) 24%, transparent); }

/* Pinned instant → "what hasn't happened yet" is meaningless. */
.live.scrubbed .future { display: none; }
/* Make the draggable strips feel grabbable. */
.timeline .strip { cursor: ew-resize; touch-action: none; }
```

If the codebase has no `--accent` var, replace with the literal teal used
elsewhere (check `dayPart.js` / existing CSS for the exact hex).

**Step 3: Commit**

```bash
git add <stylesheet>
git commit -m "style(scrub): scrubbed pill + hide future overlay + grab cursor"
```

---

### Task 5: Manual browser QA + DST/edge verification

**Files:**
- Modify: `docs/ROADMAP.md` (tick the timeline-scrub item)
- Possibly create: `docs/investigations/2026-06-05-timeline-scrub.md` if any
  non-obvious behavior surfaces (per repo doc convention).

**Step 1: Load and verify**

Open `newtab.html` (or reload the unpacked extension). With 3+ zones:

1. Drag a marker on any timeline row → all rows + the big clock move together,
   snapping to 15-min steps. PASS criteria: every row stays consistent (same
   absolute instant), `dayOffset` chips update when a zone rolls a day.
2. Release → UI is frozen (big clock seconds stop), pill shows the scrubbed
   local time.
3. Click the pill → returns to live, seconds resume.
4. Scrub again, press Escape → returns to live.
5. Confirm the future-dim overlay disappears while scrubbed and returns on reset.
6. Drag must not jump/snap-back mid-drag (the pointer-capture caveat in Task 3).
   If it does, switch `onScrub` to `updateLive` and re-test.

**Step 2: Edge checks**

- Solo zone (remove all but one): no timeline → scrub unavailable. PASS.
- Edit mode: markers should not initiate a scrub while editing zones (the
  edit panel is a separate overlay; confirm no conflict). If a conflict exists,
  guard `attachScrub`'s `pointerdown` with `if (ctx.editMode) return;` and add
  `editMode` to the values passed through render's `ctx` reads.

**Step 3: Full test suite**

Run: `node --test test/*.test.js`
Expected: PASS, all suites.

**Step 4: Tick the roadmap**

In `docs/ROADMAP.md`, mark the "Timeline scrub" Polish/UX bullet as shipped
(strike-through + `Shipped 2026-06-05.`), matching the existing shipped-item
style.

**Step 5: Commit**

```bash
git add docs/ROADMAP.md docs/investigations/ 2>/dev/null
git commit -m "docs(scrub): mark timeline scrub shipped; QA notes"
```

---

## Done criteria

- All `node --test test/*.test.js` pass, including the 4 new `scrubToInstant` tests.
- Dragging any timeline marker freezes the whole UI at a 15-min-snapped instant; all rows, cards, and the big clock agree.
- Pill and Escape both return to live; future-overlay hidden while scrubbed.
- Scrub disabled for solo zone and (if conflicting) edit mode.
- ROADMAP updated.
