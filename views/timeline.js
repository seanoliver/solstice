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
    wrap.innerHTML = `<span class="tl-label">${row.label}</span>`;
    wrap.appendChild(bar);
    const t = document.createElement("span");
    t.className = "tl-time"; t.textContent = row.label2;
    wrap.appendChild(t);
    el.appendChild(wrap);
  }
}
