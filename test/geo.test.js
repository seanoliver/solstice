import { test } from "node:test";
import assert from "node:assert/strict";
import {
  writeCachedGeo, writeCachedIp, readHome, writeHome,
  resolveLocalLabel, resolveLocalCoords, needsRefresh,
  resolveCity, fetchCityIP, refreshLocation,
} from "../src/geo.js";

function stub() {
  const mem = {};
  return {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
    _mem: mem,
  };
}

test("home label: write, read, and clear", () => {
  const s = stub();
  assert.equal(readHome(s), null);
  writeHome(s, "  New York, NY  ");
  assert.equal(readHome(s), "New York, NY"); // trimmed
  writeHome(s, "");
  assert.equal(readHome(s), null); // cleared
});

test("resolveLocalLabel cascade precedence: home > geo > ip > fallback", () => {
  const s = stub();
  assert.equal(resolveLocalLabel(s, "TZ City"), "TZ City"); // nothing set
  writeCachedIp(s, { city: "Morgan Hill" }, 1000);
  assert.equal(resolveLocalLabel(s, "TZ City", 1000), "Morgan Hill");
  writeCachedGeo(s, { city: "San Francisco" }, 1000);
  assert.equal(resolveLocalLabel(s, "TZ City", 1000), "San Francisco");
  writeHome(s, "New York, NY");
  assert.equal(resolveLocalLabel(s, "TZ City", 1000), "New York, NY");
});

test("stale caches fall through in the cascade", () => {
  const s = stub();
  writeCachedGeo(s, { city: "San Francisco" }, 0);
  const late = 24 * 60 * 60 * 1000 + 1;
  assert.equal(resolveLocalLabel(s, "TZ City", late), "TZ City");
});

test("resolveLocalCoords cascade: geo > ip > null", () => {
  const s = stub();
  assert.equal(resolveLocalCoords(s, 1000), null); // nothing cached
  writeCachedIp(s, { city: "Morgan Hill", lat: 37.13, lon: -121.65 }, 1000);
  assert.deepEqual(resolveLocalCoords(s, 1000), { lat: 37.13, lon: -121.65 });
  writeCachedGeo(s, { city: "San Francisco", lat: 37.77, lon: -122.42 }, 1000);
  assert.deepEqual(resolveLocalCoords(s, 1000), { lat: 37.77, lon: -122.42 });
});

test("resolveLocalCoords: manual home does not block detected coords", () => {
  const s = stub();
  writeCachedGeo(s, { city: "San Francisco", lat: 37.77, lon: -122.42 }, 1000);
  writeHome(s, "Paris"); // label is cosmetic; coords are physical
  assert.deepEqual(resolveLocalCoords(s, 1000), { lat: 37.77, lon: -122.42 });
});

test("resolveLocalCoords: stale or coord-less caches yield null", () => {
  const s = stub();
  writeCachedGeo(s, { city: "SF", lat: 37.77, lon: -122.42 }, 0);
  const late = 24 * 60 * 60 * 1000 + 1;
  assert.equal(resolveLocalCoords(s, late), null); // stale

  const s2 = stub();
  // Pre-coords cache format: {city, ts} only. Label works; coords → null.
  s2.setItem("geoCityV2", JSON.stringify({ city: "SF", ts: 1000 }));
  assert.equal(resolveLocalLabel(s2, "TZ", 1000), "SF");
  assert.equal(resolveLocalCoords(s2, 1000), null);
});

test("needsRefresh: false when home set or fresh geo cache has coords", () => {
  const s = stub();
  assert.equal(needsRefresh(s), true);
  writeCachedGeo(s, { city: "SF", lat: 37.77, lon: -122.42 }, 1000);
  assert.equal(needsRefresh(s, 1000), false);
  const s2 = stub();
  writeHome(s2, "Anywhere");
  assert.equal(needsRefresh(s2), false);
});

test("needsRefresh: true for a fresh but coord-less geo cache (migration)", () => {
  const s = stub();
  // Pre-coords cache format — label is usable but sun coords are not, so
  // one refresh is worthwhile to upgrade the cache.
  s.setItem("geoCityV2", JSON.stringify({ city: "SF", ts: 1000 }));
  assert.equal(needsRefresh(s, 1000), true);
});

const geoOk = {
  getCurrentPosition: (ok) =>
    ok({ coords: { latitude: 37.77, longitude: -122.42 } }),
};
const geoDenied = {
  getCurrentPosition: (_ok, err) => err(new Error("denied")),
};

test("resolveCity returns the reverse-geocoded city with device coords", async () => {
  const fetchImpl = async () => ({
    ok: true, json: async () => ({ city: "San Francisco" }),
  });
  assert.deepEqual(await resolveCity({ geo: geoOk, fetchImpl }),
    { city: "San Francisco", lat: 37.77, lon: -122.42 });
});

test("resolveCity returns null when geolocation denied", async () => {
  assert.equal(await resolveCity({ geo: geoDenied }), null);
});

test("fetchCityIP falls through providers and returns provider coords", async () => {
  let n = 0;
  const fetchImpl = async () => {
    n += 1;
    if (n === 1) throw new Error("down");
    return {
      ok: true,
      json: async () => ({ city: "Morgan Hill", latitude: 37.13, longitude: -121.65 }),
    };
  };
  assert.deepEqual(await fetchCityIP(fetchImpl),
    { city: "Morgan Hill", lat: 37.13, lon: -121.65 });
});

test("fetchCityIP tolerates providers without coords", async () => {
  const fetchImpl = async () => ({
    ok: true, json: async () => ({ city: "Morgan Hill" }),
  });
  assert.deepEqual(await fetchCityIP(fetchImpl), { city: "Morgan Hill" });
});

test("refreshLocation: home set → no network, returns null", async () => {
  const s = stub();
  writeHome(s, "New York, NY");
  let called = false;
  const fetchImpl = async () => { called = true; return { ok: true, json: async () => ({}) }; };
  assert.equal(await refreshLocation(s, { geo: geoOk, fetchImpl }), null);
  assert.equal(called, false);
});

test("refreshLocation: geolocation success caches geo city and coords", async () => {
  const s = stub();
  const fetchImpl = async () => ({ ok: true, json: async () => ({ city: "San Francisco" }) });
  assert.equal(await refreshLocation(s, { geo: geoOk, fetchImpl }), "San Francisco");
  assert.equal(resolveLocalLabel(s, "TZ"), "San Francisco");
  assert.deepEqual(resolveLocalCoords(s), { lat: 37.77, lon: -122.42 });
});

test("refreshLocation: geolocation denied → IP fallback caches ip city and coords", async () => {
  const s = stub();
  const fetchImpl = async (url) =>
    ({ ok: true, json: async () => ({ city: "Morgan Hill", latitude: 37.13, longitude: -121.65 }) });
  const city = await refreshLocation(s, { geo: geoDenied, fetchImpl });
  assert.equal(city, "Morgan Hill");
  assert.equal(resolveLocalLabel(s, "TZ"), "Morgan Hill");
  assert.deepEqual(resolveLocalCoords(s), { lat: 37.13, lon: -121.65 });
});
