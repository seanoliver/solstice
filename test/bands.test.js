import { test } from "node:test";
import assert from "node:assert/strict";
import { daySegments, twilightStops } from "../src/bands.js";

test("segments cover the full day contiguously", () => {
  const segs = daySegments(348, 1233);
  assert.ok(Math.abs(segs[0].startPct - 0) < 1e-6);
  let acc = 0;
  for (const s of segs) acc += s.widthPct;
  assert.ok(Math.abs(acc - 100) < 1e-6);
  for (let i = 1; i < segs.length; i++)
    assert.ok(Math.abs((segs[i-1].startPct + segs[i-1].widthPct) - segs[i].startPct) < 1e-6);
});

test("summer day has night,morning,work,evening,night", () => {
  const parts = daySegments(348, 1233).map(s => s.part);
  assert.deepEqual(parts, ["night","morning","work","evening","night"]);
});

test("winter (sunset<17:00) has no evening", () => {
  const parts = daySegments(484, 953).map(s => s.part);
  assert.deepEqual(parts, ["night","morning","work","night"]);
});

test("twilightStops fades night into day from dawn to sunrise and back from sunset to dusk", () => {
  const segs = daySegments(420, 1140); // sunrise 07:00, sunset 19:00
  const stops = twilightStops(segs, 390, 1170); // civil dawn 06:30, dusk 19:30
  const at = (m) => (m / 1440) * 100;
  assert.deepEqual(stops, [
    { part: "night", pct: 0 },
    { part: "night", pct: at(390) }, { part: "morning", pct: at(420) },
    { part: "morning", pct: at(540) }, { part: "work", pct: at(540) },
    { part: "work", pct: at(1020) }, { part: "evening", pct: at(1020) },
    { part: "evening", pct: at(1140) }, { part: "night", pct: at(1170) },
    { part: "night", pct: 100 },
  ]);
});

test("twilightStops keeps hard edges when dawn and dusk are unknown", () => {
  const segs = daySegments(420, 1140);
  const stops = twilightStops(segs, null, null);
  for (let i = 1; i < stops.length - 1; i += 2) assert.equal(stops[i].pct, stops[i + 1].pct);
});

test("twilightStops clamps dawn to the start of the day", () => {
  const segs = daySegments(20, 1420);
  const stops = twilightStops(segs, 0, 1440);
  assert.equal(stops[1].pct, 0);
  assert.equal(stops.at(-2).pct, 100);
});
