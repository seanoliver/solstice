import { test } from "node:test";
import assert from "node:assert/strict";
import { loadZones, saveZones, addZone, removeZone, renameZone } from "../src/zones.js";

function stub() {
  const mem = {};
  return {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    _mem: mem,
  };
}

test("loadZones seeds from config on first run and persists", () => {
  const s = stub();
  const z = loadZones(s);
  assert.ok(z.length >= 1);
  assert.ok(z.some((x) => x.tz === "local"));
  assert.ok(s.getItem("zones"), "should have written seed");
});

test("loadZones round-trips a saved list and re-adds local if missing", () => {
  const s = stub();
  saveZones([{ label: "Tokyo", tz: "Asia/Tokyo", lat: 35.6, lon: 139.6 }], s);
  const z = loadZones(s);
  assert.ok(z.some((x) => x.tz === "local"), "local re-prepended");
  assert.ok(z.some((x) => x.label === "Tokyo"));
});

test("addZone appends and dedupes by tz+label", () => {
  const base = [{ label: "You", tz: "local", lat: 0, lon: 0 }];
  const city = { name: "Tokyo", tz: "Asia/Tokyo", lat: 35.6, lon: 139.6 };
  const a = addZone(base, city);
  assert.equal(a.length, 2);
  assert.equal(a[1].label, "Tokyo");
  const b = addZone(a, city);
  assert.equal(b.length, 2, "duplicate ignored");
});

test("removeZone removes by index but never the local zone", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "Tokyo", tz: "Asia/Tokyo", lat: 35.6, lon: 139.6 },
  ];
  assert.equal(removeZone(list, 1).length, 1);
  assert.equal(removeZone(list, 0).length, 2, "local protected");
});

test("renameZone updates label by index without mutating input", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "Tokyo", tz: "Asia/Tokyo", lat: 35.6, lon: 139.6 },
  ];
  const next = renameZone(list, 1, "Aiko");
  assert.equal(next[1].label, "Aiko");
  assert.equal(list[1].label, "Tokyo", "input untouched");
  assert.notEqual(next, list, "returns new list");
});

test("renameZone trims whitespace", () => {
  const list = [{ label: "Tokyo", tz: "Asia/Tokyo", lat: 0, lon: 0 }];
  assert.equal(renameZone(list, 0, "  Aiko  ")[0].label, "Aiko");
});

test("renameZone is a no-op for out-of-range idx", () => {
  const list = [{ label: "Tokyo", tz: "Asia/Tokyo", lat: 0, lon: 0 }];
  assert.equal(renameZone(list, 5, "X"), list);
  assert.equal(renameZone(list, -1, "X"), list);
});
