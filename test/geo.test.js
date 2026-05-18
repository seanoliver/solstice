import { test } from "node:test";
import assert from "node:assert/strict";
import { readCachedCity, writeCachedCity, fetchCity } from "../src/geo.js";

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
  const dayPlus = 24 * 60 * 60 * 1000 + 1;
  assert.equal(readCachedCity(s, dayPlus), null);
});

test("missing or garbage cache returns null", () => {
  const s = stub();
  assert.equal(readCachedCity(s), null);
  s.setItem("geoCity", "not json");
  assert.equal(readCachedCity(s), null);
});

test("fetchCity parses the city field", async () => {
  const fake = async () => ({ ok: true, json: async () => ({ city: "San Francisco" }) });
  assert.equal(await fetchCity(fake), "San Francisco");
});

test("fetchCity returns null on non-ok response", async () => {
  const fake = async () => ({ ok: false, json: async () => ({}) });
  assert.equal(await fetchCity(fake), null);
});

test("fetchCity returns null when the request throws", async () => {
  const fake = async () => { throw new Error("network"); };
  assert.equal(await fetchCity(fake), null);
});
