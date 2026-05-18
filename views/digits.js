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
