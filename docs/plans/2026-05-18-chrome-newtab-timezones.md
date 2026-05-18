# Chrome New Tab Multi-Timezone Visualizer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** A zero-permission Chrome MV3 new-tab extension that shows Sean's timezones in three switchable, beautiful views (Timeline / Digits / Dials).

**Architecture:** Static extension page. One pure time-model module (unit-tested under `node:test`) feeds three DOM renderers. A segmented toggle swaps renderers; choice persists in `localStorage`. No build step — native ES modules, loaded directly by Chrome and by Node for tests.

**Tech Stack:** Vanilla JS ES modules, `Intl.DateTimeFormat` for tz math, Node 24 built-in `node:test`, Chrome Manifest V3.

Design doc: `~/cortex/wiki/side-projects/2026-05-18-chrome-newtab-design.md`

---

## Conventions

- Project root: `~/code/projects/chrome-newtab/` (git already initialized).
- All source files are ES modules (`import`/`export`); no bundler.
- Pure logic lives in `src/` and is imported by both the page and tests.
- Run all tests: `node --test` from project root.
- Commit after every task.

---

### Task 1: Project scaffold + manifest + blank new tab loads

**Files:**
- Create: `~/code/projects/chrome-newtab/manifest.json`
- Create: `~/code/projects/chrome-newtab/newtab.html`
- Create: `~/code/projects/chrome-newtab/.gitignore`

**Step 1:** Write `.gitignore`:
```
node_modules/
.DS_Store
```

**Step 2:** Write `manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "Timezones New Tab",
  "version": "1.0.0",
  "description": "A readable simultaneous view of my timezones.",
  "chrome_url_overrides": { "newtab": "newtab.html" }
}
```

**Step 3:** Write `newtab.html` (module entry, minimal shell):
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Timezones</title>
  <link rel="stylesheet" href="newtab.css" />
</head>
<body>
  <main id="app" aria-live="polite"></main>
  <nav id="view-toggle" aria-label="View"></nav>
  <script type="module" src="newtab.js"></script>
</body>
</html>
```

**Step 4: Manual verify.** In Chrome: `chrome://extensions` → Developer mode → Load unpacked → select `~/code/projects/chrome-newtab`. Open a new tab. Expected: blank page titled "Timezones", no console errors except missing `newtab.css`/`newtab.js` (created later). Confirm the override works.

**Step 5: Commit**
```bash
cd ~/code/projects/chrome-newtab
git add manifest.json newtab.html .gitignore
git commit -m "feat: MV3 scaffold overriding new tab"
```

---

### Task 2: Zone config

**Files:**
- Create: `~/code/projects/chrome-newtab/config.js`

**Step 1:** Write `config.js` (hand-editable, order = display order; `local: true` resolves to the browser's zone):
```js
export const ZONES = [
  { label: "You",       tz: "local" },
  { label: "SF/LA",     tz: "America/Los_Angeles" },
  { label: "London",    tz: "Europe/London" },
  { label: "Berlin",    tz: "Europe/Berlin" },
  { label: "Singapore", tz: "Asia/Singapore" },
  { label: "Beijing",   tz: "Asia/Shanghai" },
  { label: "Sydney",    tz: "Australia/Sydney" },
];
```

**Step 2: Commit**
```bash
git add config.js && git commit -m "feat: timezone config list"
```

---

### Task 3: Time model — `zoneNow()` (TDD)

**Files:**
- Create: `~/code/projects/chrome-newtab/src/timeModel.js`
- Test: `~/code/projects/chrome-newtab/test/timeModel.test.js`

**Step 1: Write the failing test.**
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { zoneNow } from "../src/timeModel.js";

test("zoneNow returns hour/minute for an explicit instant in a fixed tz", () => {
  // 2026-05-18T12:00:00Z
  const at = new Date("2026-05-18T12:00:00Z");
  const r = zoneNow("America/Los_Angeles", at);
  assert.equal(r.hour, 5);          // UTC-7 (PDT) in May
  assert.equal(r.minute, 0);
  assert.equal(typeof r.label, "string");
  assert.match(r.label, /5:00/);
});

test("zoneNow resolves 'local' without throwing", () => {
  const r = zoneNow("local", new Date("2026-05-18T12:00:00Z"));
  assert.ok(r.hour >= 0 && r.hour <= 23);
});
```

**Step 2: Run, verify it fails.**
Run: `cd ~/code/projects/chrome-newtab && node --test`
Expected: FAIL — `zoneNow` not exported.

**Step 3: Implement minimal code in `src/timeModel.js`.**
```js
export function zoneNow(tz, at = new Date()) {
  const opts = { hour: "numeric", minute: "2-digit", hour12: true };
  if (tz !== "local") opts.timeZone = tz;
  const parts = new Intl.DateTimeFormat("en-US", {
    ...opts, hourCycle: "h23",
  }).formatToParts(at);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const label = new Intl.DateTimeFormat("en-US", opts).format(at);
  return { hour, minute, label };
}
```

**Step 4: Run, verify pass.**
Run: `node --test`
Expected: PASS (both tests).

**Step 5: Commit**
```bash
git add src/timeModel.js test/timeModel.test.js
git commit -m "feat: zoneNow time model + tests"
```

---

### Task 4: Day-part bucketing + palette (TDD)

**Files:**
- Create: `~/code/projects/chrome-newtab/src/dayPart.js`
- Test: `~/code/projects/chrome-newtab/test/dayPart.test.js`

**Step 1: Failing test.**
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { partOfDay, PALETTE } from "../src/dayPart.js";

test("partOfDay buckets hours", () => {
  assert.equal(partOfDay(2),  "asleep");   // 0–5
  assert.equal(partOfDay(7),  "morning");  // 6–8
  assert.equal(partOfDay(12), "work");     // 9–17
  assert.equal(partOfDay(19), "evening");  // 18–21
  assert.equal(partOfDay(23), "night");    // 22–23
});

test("every bucket has a palette color", () => {
  for (const k of ["asleep","morning","work","evening","night"]) {
    assert.match(PALETTE[k], /^#/);
  }
});
```

**Step 2: Run, verify fail.** `node --test` → FAIL.

**Step 3: Implement `src/dayPart.js`.**
```js
export const PALETTE = {
  asleep:  "#1b2440",
  morning: "#e8a23d",
  work:    "#f5f0e6",
  evening: "#c4682f",
  night:   "#0e1530",
};

export function partOfDay(hour) {
  if (hour < 6)  return "asleep";
  if (hour < 9)  return "morning";
  if (hour < 18) return "work";
  if (hour < 22) return "evening";
  return "night";
}
```

**Step 4: Run, verify pass.** `node --test` → PASS.

**Step 5: Commit**
```bash
git add src/dayPart.js test/dayPart.test.js
git commit -m "feat: day-part bucketing + shared palette"
```

---

### Task 5: Build the model array helper (TDD)

**Files:**
- Modify: `~/code/projects/chrome-newtab/src/timeModel.js`
- Modify: `~/code/projects/chrome-newtab/test/timeModel.test.js`

**Step 1: Add failing test.**
```js
import { buildModel } from "../src/timeModel.js";

test("buildModel maps zones to rows with part", () => {
  const zones = [{ label: "SF", tz: "America/Los_Angeles" }];
  const rows = buildModel(zones, new Date("2026-05-18T12:00:00Z"));
  assert.equal(rows[0].label, "SF");
  assert.equal(rows[0].hour, 5);
  assert.equal(rows[0].part, "asleep");
});
```

**Step 2: Run, verify fail.** `node --test` → FAIL.

**Step 3: Append to `src/timeModel.js`.**
```js
import { partOfDay } from "./dayPart.js";

export function buildModel(zones, at = new Date()) {
  return zones.map((z) => {
    const { hour, minute, label } = zoneNow(z.tz, at);
    return { label: z.label, tz: z.tz, hour, minute, label2: label,
             part: partOfDay(hour) };
  });
}
```

**Step 4: Run, verify pass.** `node --test` → PASS.

**Step 5: Commit**
```bash
git add src/timeModel.js test/timeModel.test.js
git commit -m "feat: buildModel zone-row builder"
```

---

### Task 6: Renderer interface + Digits view

**Files:**
- Create: `~/code/projects/chrome-newtab/views/digits.js`
- Create: `~/code/projects/chrome-newtab/newtab.css`

**Step 1:** Write `views/digits.js` (renderer signature `render(model, el)` used by all views):
```js
import { PALETTE } from "../src/dayPart.js";

export const name = "Digits";

export function render(model, el) {
  el.innerHTML = "";
  el.className = "view-digits";
  for (const row of model) {
    const r = document.createElement("div");
    r.className = "digit-row";
    r.style.color = PALETTE[row.part];
    r.innerHTML =
      `<span class="label">${row.label}</span>` +
      `<span class="time">${row.label2}</span>` +
      `<span class="part">${row.part}</span>`;
    el.appendChild(r);
  }
}
```

**Step 2:** Write baseline `newtab.css` (dark calm base + digits layout):
```css
:root { color-scheme: dark; }
body { margin:0; min-height:100vh; background:#0b0f1e;
  color:#f5f0e6; font:16px/1.4 ui-sans-serif,system-ui,sans-serif;
  display:flex; flex-direction:column; align-items:center;
  justify-content:center; gap:2rem; }
.view-digits { display:flex; flex-direction:column; gap:.5rem; }
.digit-row { display:grid; grid-template-columns:6rem 8rem 6rem;
  align-items:baseline; gap:1rem; }
.digit-row .time { font-size:2rem; font-variant-numeric:tabular-nums; }
.digit-row .label { opacity:.7; }
.digit-row .part { font-size:.8rem; opacity:.6; text-transform:lowercase; }
#view-toggle { position:fixed; bottom:1.5rem; display:flex; gap:.25rem; }
#view-toggle button { background:#1b2440; color:#f5f0e6; border:0;
  padding:.4rem .8rem; border-radius:999px; cursor:pointer; font:inherit; }
#view-toggle button[aria-pressed="true"] { background:#c4682f; }
```

**Step 3: Commit**
```bash
git add views/digits.js newtab.css
git commit -m "feat: renderer interface + digits view + base css"
```

---

### Task 7: Timeline view

**Files:**
- Create: `~/code/projects/chrome-newtab/views/timeline.js`
- Modify: `~/code/projects/chrome-newtab/newtab.css`

**Step 1:** Write `views/timeline.js`. Each row is a 24-cell bar; cell color = `partOfDay(cellHour)`; a NOW marker is positioned at `(hour*60+minute)/1440`.
```js
import { partOfDay, PALETTE } from "../src/dayPart.js";

export const name = "Timeline";

export function render(model, el) {
  el.innerHTML = "";
  el.className = "view-timeline";
  for (const row of model) {
    const wrap = document.createElement("div");
    wrap.className = "tl-row";
    const bar = document.createElement("div");
    bar.className = "tl-bar";
    for (let h = 0; h < 24; h++) {
      const c = document.createElement("span");
      c.style.background = PALETTE[partOfDay(h)];
      bar.appendChild(c);
    }
    const now = document.createElement("i");
    now.className = "tl-now";
    now.style.left = `${((row.hour * 60 + row.minute) / 1440) * 100}%`;
    bar.appendChild(now);
    wrap.innerHTML =
      `<span class="tl-label">${row.label}</span>`;
    wrap.appendChild(bar);
    const t = document.createElement("span");
    t.className = "tl-time"; t.textContent = row.label2;
    wrap.appendChild(t);
    el.appendChild(wrap);
  }
}
```

**Step 2:** Append to `newtab.css`:
```css
.view-timeline { display:flex; flex-direction:column; gap:.4rem;
  width:min(80vw,720px); }
.tl-row { display:grid; grid-template-columns:5rem 1fr 5rem;
  align-items:center; gap:.75rem; }
.tl-bar { position:relative; display:grid;
  grid-template-columns:repeat(24,1fr); height:1.6rem;
  border-radius:.4rem; overflow:hidden; }
.tl-bar span { display:block; }
.tl-now { position:absolute; top:-2px; bottom:-2px; width:2px;
  background:#fff; box-shadow:0 0 6px #fff; }
.tl-time { text-align:right; font-variant-numeric:tabular-nums;
  opacity:.8; }
.tl-label { opacity:.7; }
```

**Step 3: Commit**
```bash
git add views/timeline.js newtab.css
git commit -m "feat: timeline view"
```

---

### Task 8: Dials view

**Files:**
- Create: `~/code/projects/chrome-newtab/views/dials.js`
- Modify: `~/code/projects/chrome-newtab/newtab.css`

**Step 1:** Write `views/dials.js` — one small SVG clock per zone (12h face, hour+minute hand, tint by part). Grid of dials keeps it scannable.
```js
import { PALETTE } from "../src/dayPart.js";

export const name = "Dials";

function hand(cx, cy, len, angleDeg) {
  const a = (angleDeg - 90) * Math.PI / 180;
  return `${cx},${cy} ${cx + len * Math.cos(a)},${cy + len * Math.sin(a)}`;
}

export function render(model, el) {
  el.innerHTML = "";
  el.className = "view-dials";
  for (const row of model) {
    const hAng = ((row.hour % 12) + row.minute / 60) * 30;
    const mAng = row.minute * 6;
    const d = document.createElement("div");
    d.className = "dial";
    d.innerHTML = `
      <svg viewBox="0 0 100 100" width="110" height="110">
        <circle cx="50" cy="50" r="46" fill="${PALETTE[row.part]}"
          stroke="#ffffff22"/>
        <polyline points="${hand(50,50,26,hAng)}" stroke="#0b0f1e"
          stroke-width="4" stroke-linecap="round"/>
        <polyline points="${hand(50,50,38,mAng)}" stroke="#0b0f1e"
          stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="50" cy="50" r="3" fill="#0b0f1e"/>
      </svg>
      <span class="dial-label">${row.label}</span>
      <span class="dial-time">${row.label2}</span>`;
    el.appendChild(d);
  }
}
```

**Step 2:** Append to `newtab.css`:
```css
.view-dials { display:flex; flex-wrap:wrap; gap:1.5rem;
  justify-content:center; max-width:80vw; }
.dial { display:flex; flex-direction:column; align-items:center;
  gap:.25rem; }
.dial-label { opacity:.7; } .dial-time { opacity:.85;
  font-variant-numeric:tabular-nums; }
```

**Step 3: Commit**
```bash
git add views/dials.js newtab.css
git commit -m "feat: dials view"
```

---

### Task 9: Wire app — toggle, persistence, tick loop

**Files:**
- Create: `~/code/projects/chrome-newtab/newtab.js`

**Step 1:** Write `newtab.js`:
```js
import { ZONES } from "./config.js";
import { buildModel } from "./src/timeModel.js";
import * as timeline from "./views/timeline.js";
import * as digits from "./views/digits.js";
import * as dials from "./views/dials.js";

const VIEWS = { Timeline: timeline, Digits: digits, Dials: dials };
const app = document.getElementById("app");
const nav = document.getElementById("view-toggle");

let current = localStorage.getItem("view") || "Timeline";
if (!VIEWS[current]) current = "Timeline";

function draw() {
  VIEWS[current].render(buildModel(ZONES), app);
}

function buildToggle() {
  nav.innerHTML = "";
  for (const key of Object.keys(VIEWS)) {
    const b = document.createElement("button");
    b.textContent = key;
    b.setAttribute("aria-pressed", String(key === current));
    b.addEventListener("click", () => {
      current = key;
      localStorage.setItem("view", key);
      buildToggle();
      draw();
    });
    nav.appendChild(b);
  }
}

buildToggle();
draw();
setInterval(draw, 1000);
```

**Step 2: Manual verify.** Reload extension at `chrome://extensions`, open a new tab:
- All three toggle buttons present; clicking switches view immediately.
- Reload the tab → last-used view persists.
- Times match a known reference (e.g. macOS menu-bar world clock); NOW line / hands track real time.
- No console errors.

**Step 3: Run unit tests** (regression): `node --test` → all PASS.

**Step 4: Commit**
```bash
git add newtab.js
git commit -m "feat: app wiring, view toggle, persistence, tick loop"
```

---

### Task 10: README + final QA pass

**Files:**
- Create: `~/code/projects/chrome-newtab/README.md`

**Step 1:** Write `README.md`: what it is, how to load unpacked, how to edit `config.js` to change zones/order, `node --test` to run tests.

**Step 2: Full manual QA checklist** (record pass/fail in commit message):
- Override fires on every new tab.
- Each view renders all 7 zones correctly.
- Day-part colors look right at different times (spot-check by temporarily editing system clock OR trust unit tests).
- Toggle persists across tab close/reopen.
- Zero permissions in `manifest.json` (confirm no `permissions` key).

**Step 3: Commit**
```bash
git add README.md
git commit -m "docs: README + QA checklist results"
```

---

## Done Criteria

- `node --test` green.
- Extension loads unpacked with no permissions and overrides new tab.
- Three views, correct times, persistent toggle, no console errors.
- README explains config + test workflow.
