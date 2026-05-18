# Add / Remove Timezones Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Let the user add/remove cities at runtime via an Edit-mode toggle, persisted in localStorage, without editing `config.js` and without disturbing the calm default view.

**Architecture:** A bundled `cities.js` dataset feeds a unit-tested `src/zones.js` store (localStorage-backed, seeded from `config.js`, local zone pinned). `#app` is split into a per-second `.live` region and a state-driven `.editbar` so the search input keeps focus. No changes to the sun/band engine.

**Tech Stack:** Vanilla ES modules, Node 24 `node:test`, Chrome MV3. No build step.

Design: `docs/plans/2026-05-18-add-remove-zones-design.md`.

Conventions: project root `~/code/projects/chrome-newtab/`; run tests with `node --test`; commit after each task; exact code below — do not improvise.

---

### Task 1: Bundled city dataset + sanity test

**Files:**
- Create: `cities.js`
- Test: `test/cities.test.js`

**Step 1: Write the failing test** (`test/cities.test.js`):
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { CITIES } from "../cities.js";

test("city dataset is well-formed", () => {
  assert.ok(Array.isArray(CITIES) && CITIES.length >= 40);
  const seen = new Set();
  for (const c of CITIES) {
    assert.ok(c.name && typeof c.name === "string", `name: ${JSON.stringify(c)}`);
    assert.ok(typeof c.lat === "number" && c.lat >= -90 && c.lat <= 90, c.name);
    assert.ok(typeof c.lon === "number" && c.lon >= -180 && c.lon <= 180, c.name);
    // tz must be accepted by Intl
    assert.doesNotThrow(() =>
      new Intl.DateTimeFormat("en-US", { timeZone: c.tz }), `tz: ${c.name}`);
    const key = c.name + "|" + c.tz;
    assert.ok(!seen.has(key), `duplicate ${key}`);
    seen.add(key);
  }
});
```

**Step 2: Run, verify fail:** `node --test test/cities.test.js` → FAIL (no `cities.js`).

**Step 3: Create `cities.js`** with this exact curated list:
```js
// Curated major-city dataset for the add-city picker. Offline, static.
// { name, tz (IANA), lat, lon }. Extend by appending rows.
export const CITIES = [
  { name: "San Francisco", tz: "America/Los_Angeles", lat: 37.7749, lon: -122.4194 },
  { name: "Los Angeles",   tz: "America/Los_Angeles", lat: 34.0522, lon: -118.2437 },
  { name: "Seattle",       tz: "America/Los_Angeles", lat: 47.6062, lon: -122.3321 },
  { name: "Denver",        tz: "America/Denver",      lat: 39.7392, lon: -104.9903 },
  { name: "Chicago",       tz: "America/Chicago",     lat: 41.8781, lon: -87.6298  },
  { name: "Austin",        tz: "America/Chicago",     lat: 30.2672, lon: -97.7431  },
  { name: "New York",      tz: "America/New_York",    lat: 40.7128, lon: -74.0060  },
  { name: "Toronto",       tz: "America/Toronto",     lat: 43.6532, lon: -79.3832  },
  { name: "Mexico City",   tz: "America/Mexico_City", lat: 19.4326, lon: -99.1332  },
  { name: "Bogotá",        tz: "America/Bogota",      lat: 4.7110,  lon: -74.0721  },
  { name: "São Paulo",     tz: "America/Sao_Paulo",   lat: -23.5505, lon: -46.6333 },
  { name: "Buenos Aires",  tz: "America/Argentina/Buenos_Aires", lat: -34.6037, lon: -58.3816 },
  { name: "London",        tz: "Europe/London",       lat: 51.5074, lon: -0.1278  },
  { name: "Dublin",        tz: "Europe/Dublin",       lat: 53.3498, lon: -6.2603  },
  { name: "Lisbon",        tz: "Europe/Lisbon",       lat: 38.7223, lon: -9.1393  },
  { name: "Madrid",        tz: "Europe/Madrid",       lat: 40.4168, lon: -3.7038  },
  { name: "Paris",         tz: "Europe/Paris",        lat: 48.8566, lon: 2.3522   },
  { name: "Amsterdam",     tz: "Europe/Amsterdam",    lat: 52.3676, lon: 4.9041   },
  { name: "Berlin",        tz: "Europe/Berlin",       lat: 52.5200, lon: 13.4050  },
  { name: "Zurich",        tz: "Europe/Zurich",       lat: 47.3769, lon: 8.5417   },
  { name: "Rome",          tz: "Europe/Rome",         lat: 41.9028, lon: 12.4964  },
  { name: "Stockholm",     tz: "Europe/Stockholm",    lat: 59.3293, lon: 18.0686  },
  { name: "Athens",        tz: "Europe/Athens",       lat: 37.9838, lon: 23.7275  },
  { name: "Istanbul",      tz: "Europe/Istanbul",     lat: 41.0082, lon: 28.9784  },
  { name: "Moscow",        tz: "Europe/Moscow",       lat: 55.7558, lon: 37.6173  },
  { name: "Lagos",         tz: "Africa/Lagos",        lat: 6.5244,  lon: 3.3792   },
  { name: "Cairo",         tz: "Africa/Cairo",        lat: 30.0444, lon: 31.2357  },
  { name: "Johannesburg",  tz: "Africa/Johannesburg", lat: -26.2041, lon: 28.0473 },
  { name: "Nairobi",       tz: "Africa/Nairobi",      lat: -1.2921, lon: 36.8219  },
  { name: "Dubai",         tz: "Asia/Dubai",          lat: 25.2048, lon: 55.2708  },
  { name: "Tel Aviv",      tz: "Asia/Jerusalem",      lat: 32.0853, lon: 34.7818  },
  { name: "Mumbai",        tz: "Asia/Kolkata",        lat: 19.0760, lon: 72.8777  },
  { name: "Bengaluru",     tz: "Asia/Kolkata",        lat: 12.9716, lon: 77.5946  },
  { name: "Bangkok",       tz: "Asia/Bangkok",        lat: 13.7563, lon: 100.5018 },
  { name: "Jakarta",       tz: "Asia/Jakarta",        lat: -6.2088, lon: 106.8456 },
  { name: "Singapore",     tz: "Asia/Singapore",      lat: 1.3521,  lon: 103.8198 },
  { name: "Hong Kong",     tz: "Asia/Hong_Kong",      lat: 22.3193, lon: 114.1694 },
  { name: "Shanghai",      tz: "Asia/Shanghai",       lat: 31.2304, lon: 121.4737 },
  { name: "Beijing",       tz: "Asia/Shanghai",       lat: 39.9042, lon: 116.4074 },
  { name: "Seoul",         tz: "Asia/Seoul",          lat: 37.5665, lon: 126.9780 },
  { name: "Tokyo",         tz: "Asia/Tokyo",          lat: 35.6762, lon: 139.6503 },
  { name: "Sydney",        tz: "Australia/Sydney",    lat: -33.8688, lon: 151.2093 },
  { name: "Melbourne",     tz: "Australia/Melbourne", lat: -37.8136, lon: 144.9631 },
  { name: "Auckland",      tz: "Pacific/Auckland",    lat: -36.8485, lon: 174.7633 },
  { name: "Honolulu",      tz: "Pacific/Honolulu",    lat: 21.3069, lon: -157.8583 },
];
```

**Step 4: Run, verify pass:** `node --test test/cities.test.js` → PASS.

**Step 5: Commit:**
```bash
cd ~/code/projects/chrome-newtab
git add cities.js test/cities.test.js
git commit -m "feat: bundled city dataset for add-city picker"
```

---

### Task 2: Zone store (TDD)

**Files:**
- Create: `src/zones.js`
- Test: `test/zones.test.js`

**Step 1: Write the failing test** (`test/zones.test.js`):
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadZones, saveZones, addZone, removeZone } from "../src/zones.js";

function stub() {
  const mem = {};
  return {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    _mem: mem,
  };
}

test("loadZones seeds from config on first run and persists", () => {
  const s = stub();
  const z = loadZones(s);
  assert.ok(z.length >= 1);
  assert.ok(z.some((x) => x.tz === "local"));
  assert.ok(s.getItem("zones"), "should have written seed");
});

test("loadZones round-trips a saved list and re-adds local if missing", () => {
  const s = stub();
  saveZones([{ label: "Tokyo", tz: "Asia/Tokyo", lat: 35.6, lon: 139.6 }], s);
  const z = loadZones(s);
  assert.ok(z.some((x) => x.tz === "local"), "local re-prepended");
  assert.ok(z.some((x) => x.label === "Tokyo"));
});

test("addZone appends and dedupes by tz+label", () => {
  const base = [{ label: "You", tz: "local", lat: 0, lon: 0 }];
  const city = { name: "Tokyo", tz: "Asia/Tokyo", lat: 35.6, lon: 139.6 };
  const a = addZone(base, city);
  assert.equal(a.length, 2);
  assert.equal(a[1].label, "Tokyo");
  const b = addZone(a, city);
  assert.equal(b.length, 2, "duplicate ignored");
});

test("removeZone removes by index but never the local zone", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "Tokyo", tz: "Asia/Tokyo", lat: 35.6, lon: 139.6 },
  ];
  assert.equal(removeZone(list, 1).length, 1);
  assert.equal(removeZone(list, 0).length, 2, "local protected");
});
```

**Step 2: Run, verify fail:** `node --test test/zones.test.js` → FAIL.

**Step 3: Create `src/zones.js`:**
```js
import { ZONES as SEED } from "../config.js";

const isLocal = (z) => z.tz === "local";

export function ensureLocal(list) {
  if (list.some(isLocal)) return list;
  const seedLocal = SEED.find(isLocal);
  return seedLocal ? [seedLocal, ...list] : list;
}

export function saveZones(list, storage) {
  storage.setItem("zones", JSON.stringify(list));
}

export function loadZones(storage) {
  try {
    const raw = storage.getItem("zones");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return ensureLocal(arr);
    }
  } catch { /* fall through to seed */ }
  const seeded = ensureLocal(SEED.map((z) => ({ ...z })));
  saveZones(seeded, storage);
  return seeded;
}

export function addZone(list, city) {
  if (list.some((z) => z.tz === city.tz && z.label === city.name)) return list;
  return [...list, { label: city.name, tz: city.tz, lat: city.lat, lon: city.lon }];
}

export function removeZone(list, idx) {
  const z = list[idx];
  if (!z || isLocal(z)) return list;
  return list.filter((_, i) => i !== idx);
}
```

**Step 4: Run, verify pass:** `node --test test/zones.test.js` → PASS. Then full `node --test` → all green.

**Step 5: Commit:**
```bash
git add src/zones.js test/zones.test.js
git commit -m "feat: localStorage zone store (seed/add/remove/local-pinned)"
```

---

### Task 3: Split rendering into live + editbar regions

**Files:**
- Modify: `src/render.js`
- Modify: `newtab.html`
- Modify: `newtab.js`

**Goal:** No behavior change yet — just restructure so `#app` contains `<div class="editbar">` + `<div class="live">`, the tick rebuilds only `.live`, and `render` is renamed to render into a passed live element. Zones come from the store.

**Step 1:** In `src/render.js`, change the export signature from
`export function render(model, root, now)` to
`export function renderLive(model, liveEl, now)` and replace the first two
lines of the body:
```js
export function renderLive(model, liveEl, now) {
  const local = model.find((r) => r.tz === "local") || model[0];
  ...
  liveEl.innerHTML = "";
  liveEl.className = "live wt";
```
(Everything else in the function body stays the same; just `root` → `liveEl`
and the className becomes `"live wt"`.)

**Step 2:** `newtab.html` body stays `<main id="app"></main>` — no change
needed (regions are created in JS).

**Step 3:** Rewrite `newtab.js`:
```js
import { buildModel } from "./src/timeModel.js";
import { renderLive } from "./src/render.js";
import { loadZones } from "./src/zones.js";

const app = document.getElementById("app");
const editbar = document.createElement("div");
editbar.className = "editbar";
const live = document.createElement("div");
app.append(editbar, live);

let zones = loadZones(window.localStorage);

function tick() {
  const now = new Date();
  renderLive(buildModel(zones, now), live, now);
}

tick();
setInterval(tick, 1000);
```

**Step 4: Verify:** `node --check src/render.js && node --check newtab.js`
→ OK. `node --test` → all still green (logic untouched). Manual: reload
unpacked extension, confirm the page looks exactly as before (no edit UI
yet), no console errors.

**Step 5: Commit:**
```bash
git add src/render.js newtab.html newtab.js
git commit -m "refactor: split #app into editbar + live regions"
```

---

### Task 4: Edit toggle + remove (×) on cards

**Files:**
- Modify: `src/render.js` (add `renderEditBar`; add × to cards in `renderLive`)
- Modify: `newtab.js` (state + wiring)
- Modify: `newtab.css`

**Step 1:** Add to `src/render.js` a new export:
```js
export function renderEditBar(barEl, ctx) {
  barEl.innerHTML = "";
  barEl.className = "editbar";
  const toggle = document.createElement("button");
  toggle.className = "edit-toggle" + (ctx.editMode ? " on" : "");
  toggle.textContent = ctx.editMode ? "Done" : "Edit";
  toggle.addEventListener("click", () => ctx.onToggle());
  barEl.appendChild(toggle);
}
```

**Step 2:** In `renderLive`, where each `.card` is built, when
`ctx.editMode` is true and the row is not local, append a remove button.
Change the `renderLive` signature to
`export function renderLive(model, liveEl, now, ctx)` and inside the card
loop, after `c.append(head, city, time, date, stripEl(r, false));` add:
```js
    if (ctx && ctx.editMode && r.tz !== "local") {
      const x = document.createElement("button");
      x.className = "card-x";
      x.textContent = "×";
      x.title = "Remove";
      x.addEventListener("click", () => ctx.onRemove(r));
      c.appendChild(x);
      c.classList.add("editing");
    }
```

**Step 3:** Update `newtab.js` to hold state and wire callbacks:
```js
import { buildModel } from "./src/timeModel.js";
import { renderLive, renderEditBar } from "./src/render.js";
import { loadZones, saveZones, removeZone } from "./src/zones.js";

const app = document.getElementById("app");
const editbar = document.createElement("div");
const live = document.createElement("div");
app.append(editbar, live);

const store = window.localStorage;
let zones = loadZones(store);
let editMode = false;

function ctx() {
  return {
    editMode,
    onToggle() { editMode = !editMode; paintBar(); tick(); },
    onRemove(row) {
      const idx = zones.findIndex(
        (z) => z.tz === row.tz && z.label === row.label);
      zones = removeZone(zones, idx);
      saveZones(zones, store);
      tick();
    },
  };
}

function paintBar() { renderEditBar(editbar, ctx()); }

function tick() {
  const now = new Date();
  renderLive(buildModel(zones, now), live, now, ctx());
}

paintBar();
tick();
setInterval(tick, 1000);
```

**Step 4:** Append to `newtab.css`:
```css
.editbar { display:flex; justify-content:flex-end;
  max-width:1180px; margin:0 auto; padding:1.2rem 1.6rem 0; }
.edit-toggle { background:transparent; color:var(--muted);
  border:1px solid var(--border); border-radius:999px;
  padding:.35rem .9rem; font:600 11px/1 ui-monospace,Menlo,monospace;
  letter-spacing:.14em; text-transform:uppercase; cursor:pointer; }
.edit-toggle.on { color:var(--accent); border-color:#1d6f67; }
.card { position:relative; }
.card-x { position:absolute; top:.5rem; right:.5rem; width:1.4rem;
  height:1.4rem; border-radius:50%; border:0; cursor:pointer;
  background:#1b2230; color:#cdd5e0; font-size:14px; line-height:1;
  display:flex; align-items:center; justify-content:center; }
.card-x:hover { background:#3a2530; color:#ff8d8d; }
```

**Step 5: Verify:** `node --check src/render.js newtab.js` → OK.
`node --test` → all green. Manual QA: reload extension; click **Edit** →
toggle says "Done", × appears on every card except "You"; click an × →
that zone disappears from cards AND timeline and stays gone after a new
tab; click **Done** → ×s vanish, view calm again.

**Step 6: Commit:**
```bash
git add src/render.js newtab.js newtab.css
git commit -m "feat: edit-mode toggle + remove zone from cards"
```

---

### Task 5: Add-city search box

**Files:**
- Modify: `src/render.js` (`renderEditBar` gains search panel)
- Modify: `newtab.js` (query state + onAdd)
- Modify: `newtab.css`

**Step 1:** Replace `renderEditBar` in `src/render.js` with:
```js
export function renderEditBar(barEl, ctx) {
  barEl.innerHTML = "";
  barEl.className = "editbar";

  const toggle = document.createElement("button");
  toggle.className = "edit-toggle" + (ctx.editMode ? " on" : "");
  toggle.textContent = ctx.editMode ? "Done" : "Edit";
  toggle.addEventListener("click", () => ctx.onToggle());
  barEl.appendChild(toggle);

  if (!ctx.editMode) return;

  const panel = document.createElement("div");
  panel.className = "addbox";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Add a city…";
  input.value = ctx.query;
  input.addEventListener("input", (e) => ctx.onQuery(e.target.value));
  panel.appendChild(input);

  const q = ctx.query.trim().toLowerCase();
  if (q) {
    const results = ctx.cities
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 8);
    const ul = document.createElement("ul");
    ul.className = "results";
    for (const c of results) {
      const li = document.createElement("li");
      li.textContent = c.name + "  ·  " + c.tz;
      li.addEventListener("click", () => ctx.onAdd(c));
      ul.appendChild(li);
    }
    if (!results.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No match";
      ul.appendChild(li);
    }
    panel.appendChild(ul);
  }
  barEl.appendChild(panel);

  // Preserve focus + caret across state-driven rebuilds.
  if (ctx.focusSearch) {
    input.focus();
    const n = input.value.length;
    input.setSelectionRange(n, n);
  }
}
```

**Step 2:** Update `newtab.js`:
```js
import { buildModel } from "./src/timeModel.js";
import { renderLive, renderEditBar } from "./src/render.js";
import { loadZones, saveZones, addZone, removeZone } from "./src/zones.js";
import { CITIES } from "./cities.js";

const app = document.getElementById("app");
const editbar = document.createElement("div");
const live = document.createElement("div");
app.append(editbar, live);

const store = window.localStorage;
let zones = loadZones(store);
let editMode = false;
let query = "";
let focusSearch = false;

function ctx() {
  return {
    editMode, query, cities: CITIES, focusSearch,
    onToggle() {
      editMode = !editMode; query = ""; focusSearch = false;
      paintBar(); tick();
    },
    onQuery(v) { query = v; focusSearch = true; paintBar(); },
    onAdd(city) {
      zones = addZone(zones, city);
      saveZones(zones, store);
      query = ""; focusSearch = false;
      paintBar(); tick();
    },
    onRemove(row) {
      const idx = zones.findIndex(
        (z) => z.tz === row.tz && z.label === row.label);
      zones = removeZone(zones, idx);
      saveZones(zones, store);
      tick();
    },
  };
}

function paintBar() { renderEditBar(editbar, ctx()); }

function tick() {
  const now = new Date();
  renderLive(buildModel(zones, now), live, now, ctx());
}

paintBar();
tick();
setInterval(tick, 1000);
```
(Note: `.live` tick never rebuilds `editbar`, so the input keeps focus;
`focusSearch` restores caret after the `paintBar` rebuilds triggered by
typing.)

**Step 3:** Append to `newtab.css`:
```css
.editbar { flex-wrap:wrap; gap:.6rem; align-items:flex-start; }
.addbox { width:100%; display:flex; flex-direction:column;
  align-items:flex-end; gap:.4rem; }
.addbox input { width:240px; background:var(--panel);
  border:1px solid var(--border); border-radius:8px; color:var(--txt);
  padding:.5rem .7rem; font:13px/1 ui-sans-serif,system-ui,sans-serif; }
.addbox input::placeholder { color:var(--muted); }
.results { list-style:none; margin:0; padding:.3rem; width:240px;
  background:var(--panel); border:1px solid var(--border);
  border-radius:8px; }
.results li { padding:.45rem .55rem; border-radius:6px; cursor:pointer;
  font:12px/1.2 ui-monospace,Menlo,monospace; color:var(--txt); }
.results li:hover { background:#1b2230; }
.results li.empty { color:var(--muted); cursor:default; }
```

**Step 4: Verify:** `node --check src/render.js newtab.js` → OK.
`node --test` → all green. Manual QA: Edit → type "tok" → "Tokyo" result
→ click → Tokyo card + timeline row appear and persist across new tab;
input keeps focus while typing (no 1s reset); duplicate add is a no-op;
Done resets and hides the box.

**Step 5: Commit:**
```bash
git add src/render.js newtab.js newtab.css
git commit -m "feat: add-city search box in edit mode"
```

---

### Task 6: README + docs sync

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-05-18-timeline-redesign.md` (append a note)

**Step 1:** Update `README.md`: add/remove cities via the **Edit** toggle
(no need to edit `config.js`; it is now only the first-run default).
City list lives in `cities.js`; zones persist in `localStorage`. Note new
files `cities.js`, `src/zones.js`. Keep `node --test` instructions.

**Step 2:** Append a short "Add/remove zones" note to
`docs/plans/2026-05-18-timeline-redesign.md` pointing at the design and
this plan.

**Step 3: Verify:** `node --test` → all green; `git status` clean after commit.

**Step 4: Commit:**
```bash
git add README.md docs/plans/2026-05-18-timeline-redesign.md
git commit -m "docs: document add/remove zones"
```

---

## Done Criteria

- `node --test` green (cities + zones suites added).
- Edit toggle reveals × on non-local cards and an add-city search; default
  view unchanged and calm.
- Add/remove persists across new tabs via localStorage; local "You" zone
  cannot be removed; `config.js` is only the first-run seed.
- Search input keeps focus/caret while typing (tick rebuilds only `.live`).
- README + design/plan docs updated.
