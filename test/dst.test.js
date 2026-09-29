import { test } from "node:test";
import assert from "node:assert/strict";
import { offsetMinutes, nextOffsetChange, dstBadge } from "../src/dst.js";

test("offsetMinutes reads a zone's UTC offset at an instant", () => {
  assert.equal(offsetMinutes("Europe/London", new Date("2026-07-01T12:00:00Z")), 60);
  assert.equal(offsetMinutes("Europe/London", new Date("2026-12-01T12:00:00Z")), 0);
  assert.equal(offsetMinutes("Asia/Kathmandu", new Date("2026-07-01T12:00:00Z")), 345);
  assert.equal(offsetMinutes("America/New_York", new Date("2026-12-01T12:00:00Z")), -300);
});

test("nextOffsetChange finds London's autumn change to the minute", () => {
  const c = nextOffsetChange("Europe/London", new Date("2026-10-21T17:00:00Z"));
  assert.equal(c.at.toISOString(), "2026-10-25T01:00:00.000Z");
  assert.equal(c.deltaMinutes, -60);
});

test("nextOffsetChange finds Sydney's spring-forward change", () => {
  const c = nextOffsetChange("Australia/Sydney", new Date("2026-09-29T00:00:00Z"));
  assert.equal(c.at.toISOString(), "2026-10-03T16:00:00.000Z");
  assert.equal(c.deltaMinutes, 60);
});

test("nextOffsetChange ignores changes more than 7 days out", () => {
  assert.equal(nextOffsetChange("America/New_York", new Date("2026-10-21T17:00:00Z")), null);
});

test("nextOffsetChange returns null for zones without DST", () => {
  assert.equal(nextOffsetChange("Asia/Tokyo", new Date("2026-10-21T17:00:00Z")), null);
});

test("nextOffsetChange returns null for an invalid zone", () => {
  assert.equal(nextOffsetChange("Not/AZone", new Date("2026-10-21T17:00:00Z")), null);
});

test("dstBadge counts calendar days in the zone", () => {
  const london = (iso) => dstBadge("Europe/London", new Date(iso));
  assert.equal(london("2026-10-21T17:00:00Z").text, "−1h in 4d");
  assert.equal(london("2026-10-24T09:00:00Z").text, "−1h tomorrow");
  assert.equal(london("2026-10-24T23:30:00Z").text, "−1h today");
  assert.equal(london("2026-10-25T12:00:00Z"), null);
});

test("dstBadge describes the change in its title", () => {
  const b = dstBadge("Europe/London", new Date("2026-10-21T17:00:00Z"));
  assert.equal(b.title, "Clocks go back 1h on Sun, Oct 25");
  const s = dstBadge("Australia/Sydney", new Date("2026-09-29T00:00:00Z"));
  assert.equal(s.title, "Clocks go forward 1h on Sun, Oct 4");
});

test("dstBadge formats half-hour changes in minutes", () => {
  const b = dstBadge("Australia/Lord_Howe", new Date("2026-10-01T00:00:00Z"));
  assert.equal(b.text, "+30m in 3d");
});
