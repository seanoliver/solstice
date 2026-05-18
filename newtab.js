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
