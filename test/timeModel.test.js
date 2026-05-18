import { test } from "node:test";
import assert from "node:assert/strict";
import { zoneNow, buildModel } from "../src/timeModel.js";

test("zoneNow returns hour/minute/label for a fixed instant", () => {
  const r = zoneNow("America/Los_Angeles", new Date("2026-05-18T19:00:00Z"));
  assert.equal(r.hour, 12);
  assert.equal(typeof r.label, "string");
});

test("zoneNow.hour is 24-hour for a PM instant (regression)", () => {
  // 18:15 UTC → London (BST) 19:15 → must be hour 19, not 7.
  const r = zoneNow("Europe/London", new Date("2026-05-18T18:15:00Z"));
  assert.equal(r.hour, 19);
  assert.equal(r.minute, 15);
  assert.match(r.label, /7:15/);
  assert.match(r.label, /PM/);
});

test("buildModel classifies a PM zone correctly (regression)", () => {
  const zones = [{ label: "LDN", tz: "Europe/London", lat: 51.5074, lon: -0.1278 }];
  const row = buildModel(zones, new Date("2026-05-18T18:15:00Z"))[0];
  assert.equal(row.minutesOfDay, 19 * 60 + 15); // 1155, not 435
  assert.equal(row.part, "evening");            // 19:15 is post-work, pre-sunset
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
