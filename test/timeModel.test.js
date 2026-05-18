import { test } from "node:test";
import assert from "node:assert/strict";
import { zoneNow, buildModel } from "../src/timeModel.js";

test("zoneNow returns hour/minute/label for a fixed instant", () => {
  const r = zoneNow("America/Los_Angeles", new Date("2026-05-18T19:00:00Z"));
  assert.equal(r.hour, 12);
  assert.equal(typeof r.label, "string");
});

test("buildModel row has the full shape", () => {
  const zones = [{ label: "SF", tz: "America/Los_Angeles", lat: 37.7749, lon: -122.4194 }];
  const row = buildModel(zones, new Date("2026-05-18T19:00:00Z"))[0];
  assert.equal(row.label, "SF");
  assert.equal(typeof row.minutesOfDay, "number");
  assert.ok(["night","morning","work","evening"].includes(row.part));
  assert.ok(Array.isArray(row.segments) && row.segments.length >= 1);
  assert.ok(row.dayProgress >= 0 && row.dayProgress <= 1);
  assert.match(row.dateLabel, /\w{3},\s\w{3}\s\d/); // e.g. "Mon, May 18"
  assert.equal(typeof row.tzAbbrev, "string");
  assert.ok(row.tzAbbrev.length > 0);
});
