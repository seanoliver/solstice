# Edit Panel Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Replace the bottom-right add-city box and separate Home label input with a single right-edge side panel that exposes every zone for inline rename, drag-to-reorder, and keyboard-navigable city search.

**Architecture:** Add two pure functions (`renameZone`, `reorderZones`) to `src/zones.js`. Replace `renderEditBar` in `src/render.js` with a panel that re-renders only on edit-state changes (not on the 1Hz tick). Wire `onRename` and `onReorder` ctx handlers in `newtab.js`; fold the old `homebox` into the local row's editable label.

**Tech Stack:** Vanilla ESM, no build step. `node --test` for unit tests. Pointer Events API for drag. No new deps.

**Design reference:** `docs/plans/2026-05-20-edit-panel-redesign-design.md`

---

## Task 1: `renameZone` data function + tests

**Files:**
- Modify: `src/zones.js` (add export)
- Modify: `test/zones.test.js` (add cases)

**Step 1: Write failing tests**

Append to `test/zones.test.js`:

```js
test("renameZone updates label by index without mutating input", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "Tokyo", tz: "Asia/Tokyo", lat: 35.6, lon: 139.6 },
  ];
  const next = renameZone(list, 1, "Aiko");
  assert.equal(next[1].label, "Aiko");
  assert.equal(list[1].label, "Tokyo", "input untouched");
  assert.notEqual(next, list, "returns new list");
});

test("renameZone trims whitespace", () => {
  const list = [{ label: "Tokyo", tz: "Asia/Tokyo", lat: 0, lon: 0 }];
  assert.equal(renameZone(list, 0, "  Aiko  ")[0].label, "Aiko");
});

test("renameZone is a no-op for out-of-range idx", () => {
  const list = [{ label: "Tokyo", tz: "Asia/Tokyo", lat: 0, lon: 0 }];
  assert.equal(renameZone(list, 5, "X"), list);
  assert.equal(renameZone(list, -1, "X"), list);
});
```

Update the import line at the top of `test/zones.test.js` to add `renameZone`:

```js
import { loadZones, saveZones, addZone, removeZone, renameZone } from "../src/zones.js";
```

**Step 2: Run tests to verify they fail**

Run: `node --test test/zones.test.js`
Expected: failures for `renameZone is not a function` (or similar import error).

**Step 3: Implement `renameZone`**

Append to `src/zones.js`:

```js
export function renameZone(list, idx, newLabel) {
  if (idx < 0 || idx >= list.length) return list;
  const label = String(newLabel ?? "").trim();
  return list.map((z, i) => (i === idx ? { ...z, label } : z));
}
```

**Step 4: Run tests to verify they pass**

Run: `node --test test/zones.test.js`
Expected: all tests pass.

**Step 5: Commit**

```bash
git add src/zones.js test/zones.test.js
git commit -m "feat(zones): add renameZone with tests"
```

---

## Task 2: `reorderZones` data function + tests

**Files:**
- Modify: `src/zones.js`
- Modify: `test/zones.test.js`

**Step 1: Write failing tests**

Append to `test/zones.test.js`:

```js
test("reorderZones moves item forward", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "Tokyo", tz: "Asia/Tokyo", lat: 0, lon: 0 },
    { label: "London", tz: "Europe/London", lat: 0, lon: 0 },
    { label: "NYC", tz: "America/New_York", lat: 0, lon: 0 },
  ];
  const r = reorderZones(list, 1, 3);
  assert.deepEqual(r.map((z) => z.label), ["You", "London", "NYC", "Tokyo"]);
});

test("reorderZones moves item backward", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "A", tz: "Etc/UTC", lat: 0, lon: 0 },
    { label: "B", tz: "Etc/UTC", lat: 0, lon: 0 },
    { label: "C", tz: "Etc/UTC", lat: 0, lon: 0 },
  ];
  const r = reorderZones(list, 3, 1);
  assert.deepEqual(r.map((z) => z.label), ["You", "C", "A", "B"]);
});

test("reorderZones refuses to move the local zone", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "Tokyo", tz: "Asia/Tokyo", lat: 0, lon: 0 },
  ];
  assert.equal(reorderZones(list, 0, 1), list, "local stays put");
});

test("reorderZones refuses to drop into idx 0 (local anchor)", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "Tokyo", tz: "Asia/Tokyo", lat: 0, lon: 0 },
  ];
  assert.equal(reorderZones(list, 1, 0), list, "anchor protected");
});

test("reorderZones is a no-op when from === to or out of range", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "Tokyo", tz: "Asia/Tokyo", lat: 0, lon: 0 },
  ];
  assert.equal(reorderZones(list, 1, 1), list);
  assert.equal(reorderZones(list, 5, 1), list);
  assert.equal(reorderZones(list, 1, -1), list);
});
```

Update the import at the top:

```js
import { loadZones, saveZones, addZone, removeZone, renameZone, reorderZones } from "../src/zones.js";
```

**Step 2: Run tests to verify they fail**

Run: `node --test test/zones.test.js`
Expected: failures referencing `reorderZones`.

**Step 3: Implement `reorderZones`**

Append to `src/zones.js`:

```js
export function reorderZones(list, fromIdx, toIdx) {
  if (fromIdx === toIdx) return list;
  if (fromIdx < 0 || fromIdx >= list.length) return list;
  if (toIdx < 0 || toIdx >= list.length) return list;
  if (isLocal(list[fromIdx])) return list;
  if (toIdx === 0) return list; // local anchor
  const next = list.slice();
  const [item] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, item);
  return next;
}
```

**Step 4: Run tests to verify they pass**

Run: `node --test test/zones.test.js`
Expected: all tests pass.

**Step 5: Commit**

```bash
git add src/zones.js test/zones.test.js
git commit -m "feat(zones): add reorderZones with tests"
```

---

## Task 3: Wire `onRename` and `onReorder` ctx handlers

**Files:**
- Modify: `newtab.js`

**Step 1: Update imports**

In `newtab.js` line 3, change:

```js
import { loadZones, saveZones, addZone, removeZone } from "./src/zones.js";
```

to:

```js
import {
  loadZones, saveZones, addZone, removeZone, renameZone, reorderZones,
} from "./src/zones.js";
```

**Step 2: Add handlers to `ctx()`**

In `newtab.js`, inside the `ctx()` return object (after `onHome`), add:

```js
onRename(row, value) {
  if (row.tz === "local") { this.onHome(value); return; }
  const idx = zones.findIndex(
    (z) => z.tz === row.tz && z.label === row.label);
  if (idx < 0) return;
  zones = renameZone(zones, idx, value);
  saveZones(zones, store);
  paintBar(); tick();
},
onReorder(fromIdx, toIdx) {
  zones = reorderZones(zones, fromIdx, toIdx);
  saveZones(zones, store);
  paintBar(); tick();
},
```

Also expose `zones` to render via ctx so the panel can iterate it in order. Add to ctx return:

```js
zones,
```

(Place near the existing `cities: CITIES` line.)

**Step 3: Verify nothing breaks**

Run: `node --test`
Expected: all tests pass (no UI yet; this task only adds plumbing).

**Step 4: Manual smoke check**

Open `newtab.html` in Chrome (load unpacked or open the file). Confirm the page still renders and existing Edit mode still works (add a city, remove a city). The new handlers are unused — this step just verifies we didn't regress.

**Step 5: Commit**

```bash
git add newtab.js
git commit -m "feat(newtab): wire onRename/onReorder ctx handlers"
```

---

## Task 4: Render side panel skeleton (replaces `renderEditBar`)

**Files:**
- Modify: `src/render.js`
- Modify: `newtab.css`

**Step 1: Replace `renderEditBar` body**

In `src/render.js`, replace the entire `renderEditBar` function with:

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
  barEl.appendChild(buildEditPanel(ctx));
}

function buildEditPanel(ctx) {
  const panel = document.createElement("aside");
  panel.className = "editpanel";

  const header = document.createElement("div");
  header.className = "ep-header";
  const title = document.createElement("span");
  title.textContent = "Edit zones";
  const close = document.createElement("button");
  close.className = "ep-close";
  close.textContent = "×";
  close.title = "Close";
  close.addEventListener("click", () => ctx.onToggle());
  header.append(title, close);
  panel.appendChild(header);

  const list = document.createElement("ul");
  list.className = "ep-list";
  ctx.zones.forEach((z, idx) => {
    list.appendChild(buildZoneRow(z, idx, ctx));
  });
  panel.appendChild(list);

  panel.appendChild(buildSearch(ctx));

  const done = document.createElement("button");
  done.className = "ep-done";
  done.textContent = "Done";
  done.addEventListener("click", () => ctx.onToggle());
  panel.appendChild(done);

  return panel;
}

function buildZoneRow(z, idx, ctx) {
  const row = document.createElement("li");
  row.className = "zone-row" + (z.tz === "local" ? " zone-local" : "");
  row.dataset.idx = String(idx);

  const handle = document.createElement("span");
  handle.className = "drag-handle";
  handle.textContent = z.tz === "local" ? "" : "≡";
  row.appendChild(handle);

  const label = document.createElement("span");
  label.className = "zone-label";
  label.textContent = z.label;
  label.title = "Click to rename";
  row.appendChild(label);

  const abbr = document.createElement("span");
  abbr.className = "zone-abbr";
  abbr.textContent = tzAbbr(z.tz);
  row.appendChild(abbr);

  if (z.tz !== "local") {
    const x = document.createElement("button");
    x.className = "zone-x";
    x.textContent = "×";
    x.title = "Remove";
    x.addEventListener("click", () => ctx.onRemove(z));
    row.appendChild(x);
  } else {
    const spacer = document.createElement("span");
    spacer.className = "zone-x zone-x-spacer";
    row.appendChild(spacer);
  }
  return row;
}

function tzAbbr(tz) {
  if (tz === "local") tz = undefined;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, timeZoneName: "short",
    }).formatToParts(new Date());
    return (parts.find((p) => p.type === "timeZoneName") || {}).value || "";
  } catch { return ""; }
}

function buildSearch(ctx) {
  const wrap = document.createElement("div");
  wrap.className = "ep-search";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Add a city…";
  input.value = ctx.query;
  input.addEventListener("input", (e) => ctx.onQuery(e.target.value));
  wrap.appendChild(input);

  const q = ctx.query.trim().toLowerCase();
  if (q) {
    const results = ctx.cities
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 8);
    const ul = document.createElement("ul");
    ul.className = "results";
    if (!results.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No match";
      ul.appendChild(li);
    } else {
      for (const c of results) {
        const li = document.createElement("li");
        li.textContent = c.name + "  ·  " + c.tz;
        li.addEventListener("click", () => ctx.onAdd(c));
        ul.appendChild(li);
      }
    }
    wrap.appendChild(ul);
  }

  if (ctx.focusSearch) {
    queueMicrotask(() => {
      input.focus();
      const n = input.value.length;
      input.setSelectionRange(n, n);
    });
  }
  return wrap;
}
```

Also delete the obsolete `homebox` / `addbox` block from the old `renderEditBar` — the replacement above is the entire new function.

**Step 2: Add panel CSS**

Append to `newtab.css`:

```css
/* --- edit side panel --- */
.editpanel { position:fixed; top:0; right:0; width:280px; height:100vh;
  background:var(--panel); border-left:1px solid var(--border);
  z-index:3; display:flex; flex-direction:column;
  padding:1rem; gap:.6rem;
  transform:translateX(0); animation:ep-in 150ms ease-out; }
@keyframes ep-in { from { transform:translateX(100%); } to { transform:translateX(0); } }
.ep-header { display:flex; justify-content:space-between; align-items:center;
  font:500 12px/1 "JetBrains Mono",ui-monospace,Menlo,monospace;
  letter-spacing:.14em; text-transform:uppercase; color:var(--muted);
  padding-bottom:.6rem; border-bottom:1px solid var(--border); }
.ep-close { background:transparent; border:0; color:var(--muted);
  font-size:18px; line-height:1; cursor:pointer; padding:.1rem .4rem; }
.ep-close:hover { color:var(--txt); }
.ep-list { list-style:none; margin:0; padding:0; display:flex;
  flex-direction:column; gap:.2rem; overflow-y:auto; flex:1 1 auto; }
.zone-row { display:grid; grid-template-columns:1.2rem 1fr auto 1.4rem;
  align-items:center; gap:.5rem; padding:.4rem .3rem; border-radius:6px; }
.zone-row:hover { background:#11161e; }
.drag-handle { color:var(--muted); cursor:grab; user-select:none;
  text-align:center; font:14px/1 "JetBrains Mono",ui-monospace,Menlo,monospace; }
.zone-local .drag-handle { cursor:default; }
.zone-label { font-size:13px; color:var(--txt);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  cursor:text; }
.zone-label-input { width:100%; background:#11161e; color:var(--txt);
  border:1px solid var(--border); border-radius:4px; padding:.2rem .4rem;
  font:13px/1 ui-sans-serif,system-ui,sans-serif; }
.zone-abbr { font:11px/1 "JetBrains Mono",ui-monospace,Menlo,monospace;
  color:var(--muted); letter-spacing:.06em; }
.zone-x { width:1.4rem; height:1.4rem; border-radius:50%; border:0;
  cursor:pointer; background:#1b2230; color:#cdd5e0; font-size:14px;
  line-height:1; display:flex; align-items:center; justify-content:center; }
.zone-x:hover { background:#3a2530; color:#ff8d8d; }
.zone-x-spacer { background:transparent; cursor:default; }
.ep-search { display:flex; flex-direction:column; gap:.3rem;
  border-top:1px solid var(--border); padding-top:.6rem; }
.ep-search input { background:var(--panel); border:1px solid var(--border);
  border-radius:8px; color:var(--txt); padding:.5rem .7rem;
  font:13px/1 ui-sans-serif,system-ui,sans-serif; }
.ep-search input::placeholder { color:var(--muted); }
.ep-search .results { list-style:none; margin:0; padding:.2rem;
  background:#11161e; border:1px solid var(--border); border-radius:6px;
  max-height:200px; overflow-y:auto; }
.ep-search .results li { padding:.4rem .5rem; border-radius:4px;
  cursor:pointer; font:12px/1.2 "JetBrains Mono",ui-monospace,Menlo,monospace;
  color:var(--txt); }
.ep-search .results li:hover,
.ep-search .results li.active { background:#1b2230; }
.ep-search .results li.empty { color:var(--muted); cursor:default; }
.ep-done { margin-top:.4rem; padding:.5rem; background:var(--accent);
  color:#06201d; border:0; border-radius:8px;
  font:500 12px/1 "JetBrains Mono",ui-monospace,Menlo,monospace;
  letter-spacing:.12em; text-transform:uppercase; cursor:pointer; }
/* While panel is open, the bottom-right toggle stays — it just reads "Done". */
@media (max-width: 600px) {
  .editpanel { width:100vw; border-left:0; }
}
```

Also remove now-unused `.addbox`, `.homebox`, and old `.results` rules in `newtab.css` (lines roughly 127-145 — confirm before deleting).

**Step 3: Manual smoke test**

Open `newtab.html` in Chrome. Click Edit. Confirm:
- Panel slides in from the right.
- Each zone appears as a row with handle (except local), label, tz abbr, and × (except local).
- Search at the bottom still works (click to add).
- Done button closes the panel.

No keyboard nav, no drag, no inline edit yet — those are the next tasks.

**Step 4: Commit**

```bash
git add src/render.js newtab.css
git commit -m "feat(render): side panel skeleton with zone list and search"
```

---

## Task 5: Inline label editing

**Files:**
- Modify: `src/render.js`

**Step 1: Replace label element with click-to-edit**

In `src/render.js`, inside `buildZoneRow`, replace the `label` block with:

```js
const label = document.createElement("span");
label.className = "zone-label";
label.textContent = z.label || (z.tz === "local" ? "(detect)" : "");
label.title = "Click to rename";
label.addEventListener("click", () => startEdit(label, z, ctx));
row.appendChild(label);
```

Add this helper function in `src/render.js` (near `tzAbbr`):

```js
function startEdit(labelEl, row, ctx) {
  const input = document.createElement("input");
  input.className = "zone-label-input";
  input.value = row.label === "(detect)" ? "" : (row.label || "");
  let committed = false;
  const commit = () => {
    if (committed) return; committed = true;
    ctx.onRename(row, input.value);
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    else if (e.key === "Escape") { committed = true; ctx.onToggle(); ctx.onToggle(); }
  });
  input.addEventListener("blur", commit);
  labelEl.replaceWith(input);
  input.focus();
  input.select();
}
```

Note: Escape closes-and-reopens the panel to discard the edit (cheap; no extra state). If that feels jarring during manual QA, swap to `paintBar()` instead — but `paintBar` is not exposed to `render.js`, so use the toggle trick or accept Escape ≈ commit.

**Cleaner alternative — accept Escape ≈ blur** (simpler, recommended):

```js
function startEdit(labelEl, row, ctx) {
  const input = document.createElement("input");
  input.className = "zone-label-input";
  input.value = row.label || "";
  let committed = false;
  const commit = () => {
    if (committed) return; committed = true;
    ctx.onRename(row, input.value);
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault(); input.blur();
    }
  });
  input.addEventListener("blur", commit);
  labelEl.replaceWith(input);
  input.focus();
  input.select();
}
```

Use the cleaner alternative.

**Step 2: Manual test**

Reload page. Click Edit. Click a label (e.g. Tokyo). Type "Aiko". Press Enter. Confirm the card label and timeline label update, panel rebuilds with new label. Reload — confirm persistence.

Click the local row's label, clear it, blur. Confirm geo-detection re-runs (you should see `[geo]` console logs and the label fall back to detection).

**Step 3: Commit**

```bash
git add src/render.js
git commit -m "feat(render): click-to-edit zone labels"
```

---

## Task 6: Pointer-based drag-to-reorder

**Files:**
- Modify: `src/render.js`

**Step 1: Add drag wiring to `buildEditPanel`**

In `src/render.js`, modify `buildEditPanel` so it returns the panel **after** wiring drag. After the `ctx.zones.forEach(...)` block, add:

```js
attachDrag(list, ctx);
```

Then add the `attachDrag` function (near the other helpers in `render.js`):

```js
function attachDrag(listEl, ctx) {
  let state = null;

  listEl.addEventListener("pointerdown", (e) => {
    const handle = e.target.closest(".drag-handle");
    if (!handle) return;
    const row = handle.closest(".zone-row");
    if (!row || row.classList.contains("zone-local")) return;
    const fromIdx = Number(row.dataset.idx);
    if (!Number.isInteger(fromIdx) || fromIdx <= 0) return;

    e.preventDefault();
    handle.setPointerCapture(e.pointerId);

    const rows = Array.from(listEl.querySelectorAll(".zone-row"));
    const rect = row.getBoundingClientRect();
    const rowH = rect.height;
    state = {
      pointerId: e.pointerId, handle, row, rows, fromIdx,
      startY: e.clientY, rowH, currentTarget: fromIdx,
    };
    row.classList.add("dragging");
  });

  listEl.addEventListener("pointermove", (e) => {
    if (!state || e.pointerId !== state.pointerId) return;
    const dy = e.clientY - state.startY;
    state.row.style.transform = `translateY(${dy}px)`;
    // Target idx = source + round(dy / rowH), clamped to [1, rows.length-1].
    let target = state.fromIdx + Math.round(dy / state.rowH);
    if (target < 1) target = 1;
    if (target >= state.rows.length) target = state.rows.length - 1;
    if (target !== state.currentTarget) {
      state.currentTarget = target;
      // Shift other rows visually.
      state.rows.forEach((r, i) => {
        if (i === state.fromIdx) return;
        let shift = 0;
        if (state.fromIdx < target && i > state.fromIdx && i <= target) shift = -state.rowH;
        else if (state.fromIdx > target && i < state.fromIdx && i >= target) shift = state.rowH;
        r.style.transform = shift ? `translateY(${shift}px)` : "";
      });
    }
  });

  const finish = (e) => {
    if (!state || e.pointerId !== state.pointerId) return;
    const { fromIdx, currentTarget } = state;
    state.rows.forEach((r) => { r.style.transform = ""; });
    state.row.classList.remove("dragging");
    state = null;
    if (currentTarget !== fromIdx) ctx.onReorder(fromIdx, currentTarget);
  };
  listEl.addEventListener("pointerup", finish);
  listEl.addEventListener("pointercancel", finish);
}
```

**Step 2: Add `.dragging` CSS**

Append to `newtab.css`:

```css
.zone-row { transition:transform 120ms ease; }
.zone-row.dragging { transition:none; opacity:.92;
  background:#1b2230; z-index:2; position:relative; }
```

**Step 3: Manual test**

Reload. Edit mode. Drag Tokyo's `≡` handle above London. On drop, confirm:
- Panel rebuilds with Tokyo above London.
- Cards (left-right) reorder accordingly.
- Timeline (top-bottom) reorders accordingly.
- Reload preserves the order.
- Try to drag a row to index 0 (above the local row). Confirm it snaps to 1 instead.

**Step 4: Commit**

```bash
git add src/render.js newtab.css
git commit -m "feat(render): pointer-based drag-to-reorder zones"
```

---

## Task 7: Keyboard navigation in search

**Files:**
- Modify: `src/render.js`

**Step 1: Replace `buildSearch` with keyboard-aware version**

In `src/render.js`, replace `buildSearch` with:

```js
function buildSearch(ctx) {
  const wrap = document.createElement("div");
  wrap.className = "ep-search";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Add a city…";
  input.value = ctx.query;
  input.addEventListener("input", (e) => ctx.onQuery(e.target.value));
  wrap.appendChild(input);

  const q = ctx.query.trim().toLowerCase();
  let results = [];
  let activeIdx = -1;
  let ul = null;

  if (q) {
    results = ctx.cities
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 8);
    ul = document.createElement("ul");
    ul.className = "results";
    if (!results.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No match";
      ul.appendChild(li);
    } else {
      results.forEach((c, i) => {
        const li = document.createElement("li");
        li.textContent = c.name + "  ·  " + c.tz;
        li.dataset.idx = String(i);
        li.addEventListener("mouseenter", () => setActive(i));
        li.addEventListener("click", () => ctx.onAdd(c));
        ul.appendChild(li);
      });
    }
    wrap.appendChild(ul);
  }

  function setActive(i) {
    activeIdx = i;
    if (!ul) return;
    Array.from(ul.children).forEach((li, idx) => {
      li.classList.toggle("active", idx === i);
    });
  }

  input.addEventListener("keydown", (e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(activeIdx < 0 ? 0 : Math.min(activeIdx + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (activeIdx > 0) setActive(activeIdx - 1);
      else setActive(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = activeIdx >= 0 ? results[activeIdx] : results[0];
      if (pick) ctx.onAdd(pick);
    } else if (e.key === "Escape") {
      e.preventDefault();
      ctx.onQuery("");
    }
  });

  if (ctx.focusSearch) {
    queueMicrotask(() => {
      input.focus();
      const n = input.value.length;
      input.setSelectionRange(n, n);
    });
  }
  return wrap;
}
```

Note: focus stays on the input the whole time — `activeIdx` is just a visual highlight. This keeps the implementation simple (no focus-juggling between `<input>` and `<ul>`).

**Step 2: Manual test**

Reload. Edit mode. Click search. Type "lon".
- Confirm London (and any other matches) appear.
- Press ArrowDown — first result highlights.
- Press ArrowDown again — second result highlights (if multiple).
- Press ArrowUp until highlight clears.
- Press Enter with no highlight — first result is added.
- Type "lon" again, press ArrowDown to highlight London, press Enter — confirm London is added.
- Press Escape — query clears.
- Mouse-hover a result — confirm highlight follows mouse.

**Step 3: Commit**

```bash
git add src/render.js
git commit -m "feat(render): keyboard-nav search results"
```

---

## Task 8: Suppress panel rerender during drag + tick safety

**Files:**
- Modify: `src/render.js`

**Step 1: Guard against drag-interrupting rerenders**

The panel rebuilds on every `paintBar()` call. `ctx.onRemove` and `ctx.onRename` both call `paintBar()` — but those only fire on user action and not mid-drag. The 1Hz `tick()` does **not** call `paintBar()`, so the panel is safe from the tick already.

However, `ctx.onReorder` is called at `pointerup` and triggers `paintBar()` immediately, rebuilding the list. Our `state` and event listeners are already null by then. Sanity-check this manually:

- Drag a row half-way, then release. Confirm no console errors and the panel rebuilds cleanly.
- Drag a row, then while still dragging, click anywhere else with another mouse button or trigger a window blur. Confirm no orphaned `dragging` class on the row after release.

If the orphan case happens, add a `pointercancel` listener (already added in Task 6's `finish`). No additional code expected.

**Step 2: Commit (if any fixes needed)**

```bash
git add src/render.js
git commit -m "fix(render): guard drag state against unexpected cancels"
```

If no fixes were needed, skip this task's commit.

---

## Task 9: Documentation + roadmap

**Files:**
- Modify: `README.md`
- Modify: `docs/ROADMAP.md`

**Step 1: Update README's "Add / remove cities" section**

In `README.md`, replace the existing "Add / remove cities" paragraph (lines ~53-58) with:

```markdown
## Edit zones

Click **Edit** (bottom-right) to open the edit panel. Inside the panel:

- Drag the `≡` handle on any row to reorder zones — the cards (left→right)
  and timeline (top→bottom) follow the new order.
- Click a zone's label to rename it (e.g. "Madrid" → "Steve"). The IANA
  timezone abbreviation stays read-only beside the label.
- Click `×` (in the panel or on the card itself) to remove a zone.
- Use the search box at the bottom to add a city. Arrow keys cycle through
  matches; Enter adds the highlighted (or first) result.

The local zone is anchored first and can't be removed or reordered, but its
label is editable — clearing it re-runs geolocation/IP detection.
```

**Step 2: Cross off "Drag-to-reorder zones" in ROADMAP**

In `docs/ROADMAP.md`, find both mentions of "Drag-to-reorder zones" (under "Next up" and "Features") and mark them done, or remove them. Example:

```markdown
2. ~~**Drag-to-reorder zones** — the obvious companion to add/remove.~~ Shipped 2026-05-20.
```

**Step 3: Run the full test suite one last time**

Run: `node --test`
Expected: all tests pass.

**Step 4: Commit**

```bash
git add README.md docs/ROADMAP.md
git commit -m "docs: edit-panel redesign — README + ROADMAP"
```

---

## Task 10: Final QA pass

**Step 1: Walk through the QA checklist from the design doc**

- Open panel, rename "Madrid" → "Steve". Confirm card label, timeline label, and panel label all update; reload preserves.
- Drag "Tokyo" above "Madrid". Confirm card order, timeline order, and panel order all change; reload preserves.
- Type "lon" in search; press Down then Enter. Confirm "London" is added without the mouse.
- Clear local row label. Confirm geo-detection re-runs (`[geo]` logs in console; label upgrades from tz-city → IP/geo city).
- Open with ≥ 8 cities so the panel scrolls. Confirm scroll works and drag still computes correct target rows.
- Resize browser narrow (< 600px). Confirm panel becomes full-width.

**Step 2: Verify nothing regressed**

- 12/24h toggle still works.
- Per-card `×` buttons still work.
- 1Hz tick still updates times without disrupting the panel.

**Step 3: If any QA item fails, file a bug journal entry**

Per CLAUDE.md, non-trivial bug fixes get an entry in `docs/bugs/` using `docs/bugs/TEMPLATE.md`. Fix → write entry → commit together.

**No commit for this task unless fixes were needed.**

---

## Done

The edit panel is shipped. Next session: consider the "Meeting / overlap finder" feature from `docs/ROADMAP.md` — the meatiest unshipped item.
