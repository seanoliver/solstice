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
