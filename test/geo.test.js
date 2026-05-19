import { test } from "node:test";
import assert from "node:assert/strict";
import {
  writeCachedGeo, writeCachedIp, readHome, writeHome,
  resolveLocalLabel, needsRefresh, resolveCity, fetchCityIP, refreshLocation,
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
  writeCachedIp(s, "Morgan Hill", 1000);
  assert.equal(resolveLocalLabel(s, "TZ City", 1000), "Morgan Hill");
  writeCachedGeo(s, "San Francisco", 1000);
  assert.equal(resolveLocalLabel(s, "TZ City", 1000), "San Francisco");
  writeHome(s, "New York, NY");
  assert.equal(resolveLocalLabel(s, "TZ City", 1000), "New York, NY");
});

test("stale caches fall through in the cascade", () => {
  const s = stub();
  writeCachedGeo(s, "San Francisco", 0);
  const late = 24 * 60 * 60 * 1000 + 1;
  assert.equal(resolveLocalLabel(s, "TZ City", late), "TZ City");
});

test("needsRefresh: false when home set or fresh geo cache exists", () => {
  const s = stub();
  assert.equal(needsRefresh(s), true);
  writeCachedGeo(s, "SF", 1000);
  assert.equal(needsRefresh(s, 1000), false);
  const s2 = stub();
  writeHome(s2, "Anywhere");
  assert.equal(needsRefresh(s2), false);
});

const geoOk = {
  getCurrentPosition: (ok) =>
    ok({ coords: { latitude: 37.77, longitude: -122.42 } }),
};
const geoDenied = {
  getCurrentPosition: (_ok, err) => err(new Error("denied")),
};

test("resolveCity returns the reverse-geocoded city", async () => {
  const fetchImpl = async () => ({
    ok: true, json: async () => ({ city: "San Francisco" }),
  });
  assert.equal(await resolveCity({ geo: geoOk, fetchImpl }), "San Francisco");
});

test("resolveCity returns null when geolocation denied", async () => {
  assert.equal(await resolveCity({ geo: geoDenied }), null);
});

test("fetchCityIP falls through providers", async () => {
  let n = 0;
  const fetchImpl = async () => {
    n += 1;
    if (n === 1) throw new Error("down");
    return { ok: true, json: async () => ({ city: "Morgan Hill" }) };
  };
  assert.equal(await fetchCityIP(fetchImpl), "Morgan Hill");
});

test("refreshLocation: home set → no network, returns null", async () => {
  const s = stub();
  writeHome(s, "New York, NY");
  let called = false;
  const fetchImpl = async () => { called = true; return { ok: true, json: async () => ({}) }; };
  assert.equal(await refreshLocation(s, { geo: geoOk, fetchImpl }), null);
  assert.equal(called, false);
});

test("refreshLocation: geolocation success caches geo city", async () => {
  const s = stub();
  const fetchImpl = async () => ({ ok: true, json: async () => ({ city: "San Francisco" }) });
  assert.equal(await refreshLocation(s, { geo: geoOk, fetchImpl }), "San Francisco");
  assert.equal(resolveLocalLabel(s, "TZ"), "San Francisco");
});

test("refreshLocation: geolocation denied → IP fallback caches ip city", async () => {
  const s = stub();
  const fetchImpl = async (url) =>
    ({ ok: true, json: async () => ({ city: "Morgan Hill" }) });
  const city = await refreshLocation(s, { geo: geoDenied, fetchImpl });
  assert.equal(city, "Morgan Hill");
  assert.equal(resolveLocalLabel(s, "TZ"), "Morgan Hill");
});
