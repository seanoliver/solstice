import { buildModel } from "./src/timeModel.js";
import { renderLive, renderEditBar } from "./src/render.js";
import {
  loadZones, saveZones, addZone, removeZone, renameZone, reorderZones,
} from "./src/zones.js";
import {
  resolveLocalLabel, needsRefresh, refreshLocation,
  readHome, writeHome,
} from "./src/geo.js";
import { CITIES } from "./cities.js";

const app = document.getElementById("app");
const editbar = document.createElement("div");
const live = document.createElement("div");
app.append(editbar, live);

const store = window.localStorage;
let zones = loadZones(store);
let editMode = false;
let query = "";
let focusSearch = false;
// Cascade: manual home > geolocation > IP > (null → buildModel uses tz city)
let localLabel = resolveLocalLabel(store, null);
let timeFmt = store.getItem("timeFmt") === "24" ? "24" : "12"; // default 12h

function ctx() {
  return {
    editMode, query, cities: CITIES, focusSearch, zones,
    localLabel,
    home: readHome(store) || "",
    timeMode: timeFmt,
    onTimeMode(m) {
      if (m !== "12" && m !== "24") return;
      timeFmt = m;
      store.setItem("timeFmt", m);
      tick();
    },
    onToggle() {
      editMode = !editMode; query = ""; focusSearch = false;
      paintBar(); tick();
    },
    onQuery(v) { query = v; focusSearch = true; paintBar(); },
    onAdd(city) {
      zones = addZone(zones, city);
      saveZones(zones, store);
      query = ""; focusSearch = false;
      paintBar(); tick();
    },
    onRemove(row) {
      const idx = zones.findIndex(
        (z) => z.tz === row.tz && z.label === row.label);
      zones = removeZone(zones, idx);
      saveZones(zones, store);
      tick();
    },
    onHome(value) {
      writeHome(store, value);
      localLabel = resolveLocalLabel(store, null);
      paintBar(); tick();
      if (needsRefresh(store)) refreshGeo(); // cleared home → re-detect
    },
    onRename(row, value) {
      if (row.tz === "local") { this.onHome(value); return; }
      if (!String(value ?? "").trim()) return;
      const idx = zones.findIndex(
        (z) => z.tz === row.tz && z.label === row.label);
      if (idx < 0) return;
      zones = renameZone(zones, idx, value);
      saveZones(zones, store);
      paintBar(); tick();
    },
    onReorder(fromIdx, toIdx) {
      zones = reorderZones(zones, fromIdx, toIdx);
      saveZones(zones, store);
      paintBar(); tick();
    },
  };
}

function paintBar() { renderEditBar(editbar, ctx()); }

function tick() {
  const now = new Date();
  renderLive(buildModel(zones, now, localLabel), live, now, ctx());
}

// Render immediately with whatever the cascade already knows; upgrade when
// detection resolves. Manual home short-circuits all of this (no network).
async function refreshGeo() {
  const city = await refreshLocation(store);
  if (city) {
    localLabel = resolveLocalLabel(store, null);
    tick();
  }
}

paintBar();
tick();
setInterval(tick, 1000);
if (needsRefresh(store)) refreshGeo();

let resizeRaf;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(tick);
});
