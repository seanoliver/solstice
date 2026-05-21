import { buildModel } from "./src/timeModel.js";
import { renderLive, updateLive, renderEditBar } from "./src/render.js";
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
      paintLive();
    },
    onToggle() {
      editMode = !editMode; query = ""; focusSearch = false;
      paintBar(); paintLive();
    },
    onQuery(v) { query = v; focusSearch = true; paintBar(); },
    onAdd(city) {
      zones = addZone(zones, city);
      saveZones(zones, store);
      query = ""; focusSearch = true;
      paintBar(); paintLive();
    },
    onRemove(row) {
      const idx = zones.findIndex(
        (z) => z.tz === row.tz && z.name === row.name);
      zones = removeZone(zones, idx);
      saveZones(zones, store);
      paintBar(); paintLive();
    },
    onHome(value) {
      writeHome(store, value);
      localLabel = resolveLocalLabel(store, null);
      paintBar(); paintLive();
      if (needsRefresh(store)) refreshGeo(); // cleared home → re-detect
    },
    onRename(row, value) {
      if (row.tz === "local") { this.onHome(value); return; }
      const idx = zones.findIndex(
        (z) => z.tz === row.tz && z.name === row.name);
      if (idx < 0) return;
      zones = renameZone(zones, idx, value);
      saveZones(zones, store);
      paintBar(); paintLive();
    },
    onReorder(fromIdx, toIdx) {
      zones = reorderZones(zones, fromIdx, toIdx);
      saveZones(zones, store);
      paintBar(); paintLive();
    },
  };
}

function paintBar() { renderEditBar(editbar, ctx()); }

// Full structural rebuild of `live`. Used on zone/format/edit changes and
// resize. Wiping the subtree momentarily collapses page height, so preserve
// scroll position across the swap.
function paintLive() {
  const now = new Date();
  const y = window.scrollY;
  renderLive(buildModel(zones, now, localLabel), live, now, ctx());
  if (window.scrollY !== y) window.scrollTo(0, y);
}

// 1Hz update: patch only the time-derived nodes in place (no teardown, so
// no height collapse and no scroll juggling).
function tick() {
  const now = new Date();
  updateLive(buildModel(zones, now, localLabel), live, now, ctx());
}

// Render immediately with whatever the cascade already knows; upgrade when
// detection resolves. Manual home short-circuits all of this (no network).
async function refreshGeo() {
  const city = await refreshLocation(store);
  if (city) {
    localLabel = resolveLocalLabel(store, null);
    paintLive();
  }
}

paintBar();
paintLive();
setInterval(tick, 1000);
if (needsRefresh(store)) refreshGeo();

// Card-grid column count depends on width, so resize needs a full rebuild.
let resizeRaf;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(paintLive);
});
