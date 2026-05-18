import { test } from "node:test";
import assert from "node:assert/strict";
import { daySegments } from "../src/bands.js";

test("segments cover the full day contiguously", () => {
  const segs = daySegments(348, 1233);
  assert.ok(Math.abs(segs[0].startPct - 0) < 1e-6);
  let acc = 0;
  for (const s of segs) acc += s.widthPct;
  assert.ok(Math.abs(acc - 100) < 1e-6);
  for (let i = 1; i < segs.length; i++)
    assert.ok(Math.abs((segs[i-1].startPct + segs[i-1].widthPct) - segs[i].startPct) < 1e-6);
});

test("summer day has night,dawn,work,evening,night", () => {
  const parts = daySegments(348, 1233).map(s => s.part);
  assert.deepEqual(parts, ["night","dawn","work","evening","night"]);
});

test("winter (sunset<17:00) has no evening", () => {
  const parts = daySegments(484, 953).map(s => s.part);
  assert.deepEqual(parts, ["night","dawn","work","night"]);
});
