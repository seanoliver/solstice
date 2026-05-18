import { test } from "node:test";
import assert from "node:assert/strict";
import { zoneNow, buildModel } from "../src/timeModel.js";

test("zoneNow returns hour/minute for an explicit instant in a fixed tz", () => {
  const at = new Date("2026-05-18T12:00:00Z");
  const r = zoneNow("America/Los_Angeles", at);
  assert.equal(r.hour, 5);
  assert.equal(r.minute, 0);
  assert.equal(typeof r.label, "string");
  assert.match(r.label, /5:00/);
});

test("zoneNow resolves 'local' without throwing", () => {
  const r = zoneNow("local", new Date("2026-05-18T12:00:00Z"));
  assert.ok(r.hour >= 0 && r.hour <= 23);
});

test("buildModel maps zones to rows with part", () => {
  const zones = [{ label: "SF", tz: "America/Los_Angeles" }];
  const rows = buildModel(zones, new Date("2026-05-18T12:00:00Z"));
  assert.equal(rows[0].label, "SF");
  assert.equal(rows[0].hour, 5);
  assert.equal(rows[0].part, "asleep");
});
