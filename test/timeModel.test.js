import { test } from "node:test";
import assert from "node:assert/strict";
import { zoneNow, buildModel, ymdNumber, cityFromTz, formatHM, minutesInZone, scrubToInstant } from "../src/timeModel.js";

test("formatHM 12-hour", () => {
  assert.deepEqual(formatHM(0, 5, "12"), { hm: "12:05", ap: "AM" });
  assert.deepEqual(formatHM(12, 0, "12"), { hm: "12:00", ap: "PM" });
  assert.deepEqual(formatHM(13, 2, "12"), { hm: "1:02", ap: "PM" });
  assert.deepEqual(formatHM(9, 30, "12"), { hm: "9:30", ap: "AM" });
});

test("formatHM 24-hour", () => {
  assert.deepEqual(formatHM(0, 5, "24"), { hm: "00:05", ap: "" });
  assert.deepEqual(formatHM(13, 2, "24"), { hm: "13:02", ap: "" });
  assert.deepEqual(formatHM(9, 30, "24"), { hm: "09:30", ap: "" });
});

test("buildModel uses the localLabel override for the local zone", () => {
  const zones = [{ label: "You", tz: "local", lat: 37.77, lon: -122.42 }];
  const row = buildModel(zones, new Date("2026-05-18T19:00:00Z"),
    "San Francisco")[0];
  assert.equal(row.label, "San Francisco");
});

test("cityFromTz turns an IANA zone into a city label", () => {
  assert.equal(cityFromTz("America/Los_Angeles"), "Los Angeles");
  assert.equal(cityFromTz("Europe/London"), "London");
  assert.equal(cityFromTz("America/Argentina/Buenos_Aires"), "Buenos Aires");
  assert.equal(cityFromTz("UTC"), "UTC");
});

test("ymdNumber day difference is tz-correct and system-independent", () => {
  const at = new Date("2026-05-18T18:15:00Z"); // SGP already May 19, LA still May 18
  const diff = ymdNumber(at, "Asia/Singapore") - ymdNumber(at, "America/Los_Angeles");
  assert.equal(diff, 1);
});

test("buildModel dayOffset: westward same day, eastward +1 (relative offsets)", () => {
  const at = new Date("2026-05-18T18:15:00Z");
  const zones = [
    { label: "LA",  tz: "America/Los_Angeles", lat: 37.77,  lon: -122.42 },
    { label: "SYD", tz: "Australia/Sydney",    lat: -33.87, lon: 151.21  },
  ];
  const [la, syd] = buildModel(zones, at);
  assert.equal(typeof la.dayOffset, "number");
  // Sydney (May 19) is one calendar day ahead of LA (May 18).
  assert.equal(syd.dayOffset - la.dayOffset, 1);
});

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

test("scrubToInstant snaps to the nearest 15 minutes in the dragged zone", () => {
  const base = new Date("2026-06-05T12:00:00Z");
  const tz = "UTC";
  const t = scrubToInstant(base, tz, 0.5);
  assert.equal(minutesInZone(t, tz), 12 * 60); // 720 min = 12:00

  const t2 = scrubToInstant(base, tz, (3 * 60 + 7) / 1440);
  assert.equal(minutesInZone(t2, tz), 3 * 60);

  const t3 = scrubToInstant(base, tz, (3 * 60 + 8) / 1440);
  assert.equal(minutesInZone(t3, tz), 3 * 60 + 15);
});

test("scrubToInstant is exact for a half-hour-offset zone", () => {
  const base = new Date("2026-06-05T06:00:00Z");
  const tz = "Asia/Kolkata"; // UTC+5:30
  const t = scrubToInstant(base, tz, (9 * 60 + 30) / 1440); // target 09:30 IST
  assert.equal(minutesInZone(t, tz), 9 * 60 + 30);
});

test("scrubToInstant lands on the target across a DST transition day", () => {
  const base = new Date("2026-03-08T20:00:00Z"); // US DST began 2026-03-08
  const tz = "America/Los_Angeles";
  const t = scrubToInstant(base, tz, (9 * 60) / 1440);
  assert.equal(minutesInZone(t, tz), 9 * 60);
});

test("scrubToInstant clamps pct to the last quarter (23:45)", () => {
  const base = new Date("2026-06-05T00:00:00Z");
  assert.equal(minutesInZone(scrubToInstant(base, "UTC", 1), "UTC"), 23 * 60 + 45);
});
