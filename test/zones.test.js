import { test } from "node:test";
import assert from "node:assert/strict";
import { loadZones, saveZones, addZone, removeZone, renameZone, reorderZones } from "../src/zones.js";

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

test("addZone appends with label+name and dedupes by tz+name", () => {
  const base = [{ label: "You", tz: "local", lat: 0, lon: 0 }];
  const city = { name: "Tokyo", tz: "Asia/Tokyo", lat: 35.6, lon: 139.6 };
  const a = addZone(base, city);
  assert.equal(a.length, 2);
  assert.equal(a[1].label, "Tokyo");
  assert.equal(a[1].name, "Tokyo", "name is recorded");
  const b = addZone(a, city);
  assert.equal(b.length, 2, "duplicate ignored");
  // Renaming should not break dedup.
  a[1].label = "Aiko";
  const c = addZone(a, city);
  assert.equal(c.length, 2, "dedup uses name, survives custom label");
});

test("loadZones backfills name from label for legacy data without name", () => {
  const s = stub();
  saveZones([
    { label: "Tokyo", tz: "Asia/Tokyo", lat: 35.6, lon: 139.6 },
  ], s);
  const z = loadZones(s);
  const tokyo = z.find((x) => x.tz === "Asia/Tokyo");
  assert.equal(tokyo.name, "Tokyo", "name backfilled from label");
});

test("renameZone preserves name when label is cleared", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "Steve", name: "Madrid", tz: "Europe/Madrid", lat: 0, lon: 0 },
  ];
  const cleared = renameZone(list, 1, "");
  assert.equal(cleared[1].label, "", "label cleared");
  assert.equal(cleared[1].name, "Madrid", "name preserved");
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

test("reorderZones moves item forward", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "Tokyo", tz: "Asia/Tokyo", lat: 0, lon: 0 },
    { label: "London", tz: "Europe/London", lat: 0, lon: 0 },
    { label: "NYC", tz: "America/New_York", lat: 0, lon: 0 },
  ];
  const r = reorderZones(list, 1, 3);
  assert.deepEqual(r.map((z) => z.label), ["You", "London", "NYC", "Tokyo"]);
});

test("reorderZones moves item backward", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "A", tz: "Etc/UTC", lat: 0, lon: 0 },
    { label: "B", tz: "Etc/UTC", lat: 0, lon: 0 },
    { label: "C", tz: "Etc/UTC", lat: 0, lon: 0 },
  ];
  const r = reorderZones(list, 3, 1);
  assert.deepEqual(r.map((z) => z.label), ["You", "C", "A", "B"]);
});

test("reorderZones refuses to move the local zone", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "Tokyo", tz: "Asia/Tokyo", lat: 0, lon: 0 },
  ];
  assert.equal(reorderZones(list, 0, 1), list, "local stays put");
});

test("reorderZones refuses to drop into idx 0 (local anchor)", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "Tokyo", tz: "Asia/Tokyo", lat: 0, lon: 0 },
  ];
  assert.equal(reorderZones(list, 1, 0), list, "anchor protected");
});

test("reorderZones is a no-op when from === to or out of range", () => {
  const list = [
    { label: "You", tz: "local", lat: 0, lon: 0 },
    { label: "Tokyo", tz: "Asia/Tokyo", lat: 0, lon: 0 },
  ];
  assert.equal(reorderZones(list, 1, 1), list);
  assert.equal(reorderZones(list, 5, 1), list);
  assert.equal(reorderZones(list, 1, -1), list);
});
