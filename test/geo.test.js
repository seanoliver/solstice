import { test } from "node:test";
import assert from "node:assert/strict";
import { readCachedCity, writeCachedCity, resolveCity } from "../src/geo.js";

function stub() {
  const mem = {};
  return {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
  };
}

test("write then read returns the city while fresh", () => {
  const s = stub();
  writeCachedCity(s, "San Francisco", 1000);
  assert.equal(readCachedCity(s, 1000), "San Francisco");
});

test("stale cache (older than TTL) returns null", () => {
  const s = stub();
  writeCachedCity(s, "San Francisco", 0);
  assert.equal(readCachedCity(s, 24 * 60 * 60 * 1000 + 1), null);
});

test("missing or garbage cache returns null", () => {
  const s = stub();
  assert.equal(readCachedCity(s), null);
  s.setItem("geoCityV2", "not json");
  assert.equal(readCachedCity(s), null);
});

const geoOk = {
  getCurrentPosition: (ok) =>
    ok({ coords: { latitude: 37.7749, longitude: -122.4194 } }),
};

test("resolveCity returns the reverse-geocoded city", async () => {
  const fetchImpl = async () => ({
    ok: true, json: async () => ({ city: "San Francisco" }),
  });
  assert.equal(await resolveCity({ geo: geoOk, fetchImpl }), "San Francisco");
});

test("resolveCity falls back to locality when city is empty", async () => {
  const fetchImpl = async () => ({
    ok: true, json: async () => ({ city: "", locality: "Mission District" }),
  });
  assert.equal(
    await resolveCity({ geo: geoOk, fetchImpl }), "Mission District");
});

test("resolveCity returns null when geolocation is denied", async () => {
  const geoDenied = {
    getCurrentPosition: (_ok, err) => err(new Error("User denied")),
  };
  const fetchImpl = async () => { throw new Error("should not be called"); };
  assert.equal(await resolveCity({ geo: geoDenied, fetchImpl }), null);
});

test("resolveCity returns null on reverse-geocode failure", async () => {
  const fetchImpl = async () => ({ ok: false, status: 503 });
  assert.equal(await resolveCity({ geo: geoOk, fetchImpl }), null);
});

test("resolveCity returns null when geolocation is unavailable", async () => {
  assert.equal(await resolveCity({ geo: null }), null);
});
