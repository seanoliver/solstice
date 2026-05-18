import { buildModel } from "./src/timeModel.js";
import { renderLive, renderEditBar } from "./src/render.js";
import { loadZones, saveZones, removeZone } from "./src/zones.js";

const app = document.getElementById("app");
const editbar = document.createElement("div");
const live = document.createElement("div");
app.append(editbar, live);

const store = window.localStorage;
let zones = loadZones(store);
let editMode = false;

function ctx() {
  return {
    editMode,
    onToggle() { editMode = !editMode; paintBar(); tick(); },
    onRemove(row) {
      const idx = zones.findIndex(
        (z) => z.tz === row.tz && z.label === row.label);
      zones = removeZone(zones, idx);
      saveZones(zones, store);
      tick();
    },
  };
}

function paintBar() { renderEditBar(editbar, ctx()); }

function tick() {
  const now = new Date();
  renderLive(buildModel(zones, now), live, now, ctx());
}

paintBar();
tick();
setInterval(tick, 1000);
