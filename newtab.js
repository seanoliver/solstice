import { buildModel } from "./src/timeModel.js";
import { renderLive } from "./src/render.js";
import { loadZones } from "./src/zones.js";

const app = document.getElementById("app");
const editbar = document.createElement("div");
editbar.className = "editbar";
const live = document.createElement("div");
app.append(editbar, live);

let zones = loadZones(window.localStorage);

function tick() {
  const now = new Date();
  renderLive(buildModel(zones, now), live, now);
}

tick();
setInterval(tick, 1000);
