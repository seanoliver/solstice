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
  const m = document.createElement("i");
  m.className = "marker";
  m.style.left = row.dayProgress * 100 + "%";
  m.style.background = PALETTE[row.part];
  strip.appendChild(m);
  return strip;
}

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

  const hb = document.createElement("div");
  hb.className = "homebox";
  const hi = document.createElement("input");
  hi.type = "text";
  hi.placeholder = "Home label — overrides detection (e.g. New York, NY)";
  hi.value = ctx.home;
  const commitHome = (e) => {
    const v = e.target.value;
    if (v.trim() !== (ctx.home || "").trim()) ctx.onHome(v);
  };
  hi.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commitHome(e); }
  });
  hi.addEventListener("blur", commitHome);
  hb.appendChild(hi);
  barEl.appendChild(hb);

  if (ctx.focusSearch) {
    input.focus();
    const n = input.value.length;
    input.setSelectionRange(n, n);
  }
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
  }
  liveEl.appendChild(cards);
  // Count- AND width-aware columns: ≤5 one row, 6+ balanced (no orphan).
  const avail = cards.clientWidth || liveEl.clientWidth || 1129;
  const cols = gridColumns(model.length, avail);
  cards.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

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
