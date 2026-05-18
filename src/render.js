import { PALETTE } from "./dayPart.js";

function splitTime(label2) {
  const parts = String(label2).trim().split(/\s+/); // handles NNBSP from Intl
  return { hm: parts[0] || "", ap: parts[1] || "" };
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

  if (ctx.focusSearch) {
    input.focus();
    const n = input.value.length;
    input.setSelectionRange(n, n);
  }
}

export function renderLive(model, liveEl, now, ctx) {
  const local = model.find((r) => r.tz === "local") || model[0];
  const t = splitTime(local.label2);
  const ss = String(now.getSeconds()).padStart(2, "0");
  const dateStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(now);

  liveEl.innerHTML = "";
  liveEl.className = "live wt";

  const top = document.createElement("header");
  top.className = "topbar";
  top.innerHTML =
    `<span class="brand"><i></i>WORLD TIME</span>` +
    `<span class="today">${dateStr}</span>`;
  liveEl.appendChild(top);

  const clock = document.createElement("section");
  clock.className = "clock";
  clock.innerHTML =
    `<div class="kicker">LOCAL TIME</div>` +
    `<div class="big">${t.hm.replace(":", '<i class="cl">:</i>')}` +
    `<sub class="ap">${t.ap}</sub></div>` +
    `<div class="secs">:${ss}</div>`;
  liveEl.appendChild(clock);

  const cards = document.createElement("section");
  cards.className = "cards";
  for (const r of model) {
    const ct = splitTime(r.label2);
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
    time.textContent =
      String(r.hour).padStart(2, "0") + ":" +
      String(r.minute).padStart(2, "0");
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
