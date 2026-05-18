import { ZONES } from "./config.js";
import { buildModel } from "./src/timeModel.js";
import { render } from "./src/render.js";

const root = document.getElementById("app");

function tick() {
  const now = new Date();
  render(buildModel(ZONES, now), root, now);
}

tick();
setInterval(tick, 1000);
