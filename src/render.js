import { PALETTE } from "./dayPart.js";
import { formatHM } from "./timeModel.js";
import { gridColumns } from "./layout.js";

function timeMode(ctx) {
  return ctx && ctx.timeMode === "24" ? "24" : "12";
}

function stripEl(row, tall) {
  const strip = document.createElement("div");
  strip.className = "strip" + (tall ? " strip-tall" : "");
  for (const s of row.segments) {
    const seg = document.createElement("span");
    seg.className = "seg";
    seg.style.left = s.startPct + "%";
    seg.style.width = s.widthPct + "%";
    seg.style.background = PALETTE[s.part];
    strip.appendChild(seg);
  }
  // Dim the part of the day that hasn't happened yet.
  const future = document.createElement("span");
  future.className = "future";
  future.style.left = row.dayProgress * 100 + "%";
  future.style.right = "0";
  strip.appendChild(future);

  // Solid white marker (CSS) on both cards and the timeline.
  const m = document.createElement("i");
  m.className = "marker";
  m.style.left = row.dayProgress * 100 + "%";
  strip.appendChild(m);
  return strip;
}

let panelMounted = false;

export function renderEditBar(barEl, ctx) {
  barEl.innerHTML = "";
  barEl.className = "editbar";

  const toggle = document.createElement("button");
  toggle.className = "edit-toggle" + (ctx.editMode ? " on" : "");
  toggle.textContent = ctx.editMode ? "Done" : "Edit";
  toggle.addEventListener("click", () => ctx.onToggle());
  barEl.appendChild(toggle);

  if (!ctx.editMode) { panelMounted = false; return; }
  const panel = buildEditPanel(ctx);
  if (!panelMounted) {
    panel.classList.add("entering");
    panelMounted = true;
  }
  barEl.appendChild(panel);
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
  attachDrag(list, ctx);
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
  label.textContent = z.tz === "local"
    ? (ctx.localLabel || "(detect)")
    : (z.label || z.name || "");
  label.title = "Click to rename";
  label.addEventListener("click", () => {
    const opts = z.tz === "local"
      ? { prefill: ctx.home || "", placeholder: ctx.localLabel || "" }
      : { prefill: z.label || "", placeholder: z.name || "" };
    startEdit(label, z, ctx, opts);
  });
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

function startEdit(labelEl, row, ctx, { prefill, placeholder }) {
  const input = document.createElement("input");
  input.className = "zone-label-input";
  input.value = prefill;
  if (placeholder) input.placeholder = placeholder;
  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    ctx.onRename(row, input.value);
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
      input.blur();
    }
  });
  input.addEventListener("blur", commit);
  labelEl.replaceWith(input);
  input.focus();
  input.select();
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
    if (e.key === "Escape") {
      e.preventDefault();
      ctx.onQuery("");
      return;
    }
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

function attachDrag(listEl, ctx) {
  let state = null;

  listEl.addEventListener("pointerdown", (e) => {
    if (state) return;
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
      pointerId: e.pointerId, row, rows, fromIdx,
      startY: e.clientY, rowH, currentTarget: fromIdx,
    };
    row.classList.add("dragging");
  });

  listEl.addEventListener("pointermove", (e) => {
    if (!state || e.pointerId !== state.pointerId) return;
    const dy = e.clientY - state.startY;
    state.row.style.transform = `translateY(${dy}px)`;
    let target = state.fromIdx + Math.round(dy / state.rowH);
    if (target < 1) target = 1;
    if (target >= state.rows.length) target = state.rows.length - 1;
    if (target !== state.currentTarget) {
      state.currentTarget = target;
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

export function renderLive(model, liveEl, now, ctx) {
  const mode = timeMode(ctx);
  const local = model.find((r) => r.tz === "local") || model[0];
  const t = formatHM(local.hour, local.minute, mode);
  const ss = String(now.getSeconds()).padStart(2, "0");
  const dateStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(now);

  liveEl.innerHTML = "";
  liveEl.className = "live wt";

  const top = document.createElement("header");
  top.className = "topbar";
  const brand = document.createElement("span");
  brand.className = "brand";
  brand.innerHTML = `<i></i>WORLD TIME`;
  const right = document.createElement("div");
  right.className = "topright";
  const today = document.createElement("span");
  today.className = "today";
  today.textContent = dateStr;
  const fmt = document.createElement("div");
  fmt.className = "fmt";
  fmt.setAttribute("role", "group");
  fmt.setAttribute("aria-label", "Time format");
  for (const m of ["12", "24"]) {
    const b = document.createElement("button");
    b.className = "fmt-opt" + (mode === m ? " on" : "");
    b.textContent = m + "h";
    b.setAttribute("aria-pressed", String(mode === m));
    b.addEventListener("click", () => ctx && ctx.onTimeMode(m));
    fmt.appendChild(b);
  }
  right.append(today, fmt);
  top.append(brand, right);
  liveEl.appendChild(top);

  const clock = document.createElement("section");
  clock.className = "clock";
  clock.innerHTML =
    `<div class="kicker">LOCAL TIME</div>` +
    `<div class="big">${t.hm.replace(":", '<i class="cl">:</i>')}` +
    `<span class="rt"><span class="secs">:${ss}</span>` +
    `<sub class="ap">${t.ap}</sub></span></div>`;
  liveEl.appendChild(clock);

  const cards = document.createElement("section");
  cards.className = "cards";
  liveEl.appendChild(cards);
  // Count- AND width-aware columns: ≤5 one row, 6+ balanced (no orphan).
  const avail = cards.clientWidth || liveEl.clientWidth || 1129;
  const cols = gridColumns(model.length, avail);
  cards.style.setProperty("--cols", cols);
  // Uneven rows → put the shorter (remainder) row on top, full rows below.
  const N = model.length;
  const rows = Math.ceil(N / cols);
  const topCount = rows > 1 ? N - (rows - 1) * cols : N;
  const needBreak = rows > 1 && N % cols !== 0;

  let idx = 0;
  for (const r of model) {
    const ct = formatHM(r.hour, r.minute, mode);
    const c = document.createElement("article");
    c.className = "card" + (r.tz === "local" ? " card-local" : "");
    const head = document.createElement("div");
    head.className = "card-head";
    head.innerHTML =
      `<span class="abbr">${r.tzAbbrev}</span>` +
      `<i class="dot" style="background:${PALETTE[r.part]}"></i>`;
    const city = document.createElement("div");
    city.className = "city";
    city.textContent = r.label;
    const time = document.createElement("div");
    time.className = "card-time";
    time.innerHTML = `${ct.hm}<sub>${ct.ap}</sub>`;
    const date = document.createElement("div");
    date.className = "card-date";
    date.textContent = r.dateLabel;
    c.append(head, city, time, date, stripEl(r, false));
    if (ctx && ctx.editMode && r.tz !== "local") {
      const x = document.createElement("button");
      x.className = "card-x";
      x.textContent = "×";
      x.title = "Remove";
      x.addEventListener("click", () => ctx.onRemove(r));
      c.appendChild(x);
      c.classList.add("editing");
    }
    cards.appendChild(c);
    idx += 1;
    if (needBreak && idx === topCount) {
      const br = document.createElement("span");
      br.className = "rowbreak";
      cards.appendChild(br);
    }
  }

  const tl = document.createElement("section");
  tl.className = "panel timeline";
  tl.innerHTML =
    `<div class="kicker">24 Hour Timeline</div>` +
    `<div class="tl-axis"><span>00</span><span>06</span>` +
    `<span>12</span><span>18</span><span>24</span></div>`;
  for (const r of model) {
    const row = document.createElement("div");
    row.className = "tlrow";
    const lab = document.createElement("span");
    lab.className = "tllab";
    lab.textContent = r.label;
    const end = document.createElement("span");
    end.className = "tlend";
    const time = document.createElement("span");
    time.className = "tltime";
    const rt = formatHM(r.hour, r.minute, mode);
    time.textContent = rt.ap ? `${rt.hm} ${rt.ap}` : rt.hm;
    const chip = document.createElement("span");
    chip.className = "tlday"; // always present → reserves constant width
    if (r.dayOffset !== 0) {
      chip.classList.add("on");
      chip.textContent =
        (r.dayOffset > 0 ? "+" : "−") + Math.abs(r.dayOffset);
      chip.title = r.dateLabel;
    }
    end.append(time, chip);
    row.append(lab, stripEl(r, true), end);
    tl.appendChild(row);
  }
  liveEl.appendChild(tl);

  const leg = document.createElement("section");
  leg.className = "panel legend";
  leg.innerHTML =
    `<div class="keys">` +
    `<span><i style="background:${PALETTE.morning}"></i>Morning</span>` +
    `<span><i style="background:${PALETTE.work}"></i>Work</span>` +
    `<span><i style="background:${PALETTE.evening}"></i>Evening</span>` +
    `<span><i style="background:${PALETTE.night}"></i>Night</span>` +
    `</div>`;
  liveEl.appendChild(leg);
}
