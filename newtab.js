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
app.append(editbar, live, githubLink());

// Static, rendered once — kept out of the 1Hz render path.
function githubLink() {
  const a = document.createElement("a");
  a.className = "gh-link";
  a.href = "https://github.com/seanoliver/solstice";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.title = "Star this project on GitHub";
  a.innerHTML =
    `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0` +
    ` 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38` +
    ` 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13` +
    `-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66` +
    `.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15` +
    `-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0` +
    ` 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82` +
    ` 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01` +
    ` 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z">` +
    `</path></svg><span>Star on GitHub</span>`;
  return a;
}

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
