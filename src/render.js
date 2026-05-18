import { PALETTE, dotColor } from "./dayPart.js";

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
  m.style.background = dotColor(row.part);
  strip.appendChild(m);
  return strip;
}

export function render(model, root, now) {
  const local = model.find((r) => r.tz === "local") || model[0];
  const t = splitTime(local.label2);
  const ss = String(now.getSeconds()).padStart(2, "0");
  const dateStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(now);

  root.innerHTML = "";
  root.className = "wt";

  const top = document.createElement("header");
  top.className = "topbar";
  top.innerHTML =
    `<span class="brand"><i></i>WORLD TIME</span>` +
    `<span class="today">${dateStr}</span>`;
  root.appendChild(top);

  const clock = document.createElement("section");
  clock.className = "clock";
  clock.innerHTML =
    `<div class="kicker">LOCAL TIME</div>` +
    `<div class="big">${t.hm.replace(":", '<i class="cl">:</i>')}` +
    `<sub class="ap">${t.ap}</sub></div>` +
    `<div class="secs">:${ss}</div>`;
  root.appendChild(clock);

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
      `<i class="dot" style="background:${dotColor(r.part)}"></i>`;
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
    cards.appendChild(c);
  }
  root.appendChild(cards);

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
    const time = document.createElement("span");
    time.className = "tltime";
    time.textContent =
      String(r.hour).padStart(2, "0") + ":" +
      String(r.minute).padStart(2, "0");
    row.append(lab, stripEl(r, true), time);
    tl.appendChild(row);
  }
  root.appendChild(tl);

  const leg = document.createElement("section");
  leg.className = "panel legend";
  leg.innerHTML =
    `<div class="kicker">Key</div><div class="keys">` +
    `<span><i style="background:${PALETTE.night}"></i>Night</span>` +
    `<span><i style="background:${PALETTE.dawn}"></i>Dawn · sunrise–9am</span>` +
    `<span><i style="background:${PALETTE.work}"></i>Work · 9am–5pm</span>` +
    `<span><i style="background:${PALETTE.evening}"></i>Evening · 5pm–sunset</span>` +
    `<span><i class="kd" style="background:#22d3ee"></i>day</span>` +
    `<span><i class="kd" style="background:#e0a23d"></i>golden</span>` +
    `<span><i class="kd" style="background:#5b6675"></i>night</span>` +
    `</div>`;
  root.appendChild(leg);
}
