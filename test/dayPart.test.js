import { test } from "node:test";
import assert from "node:assert/strict";
import { partOfDay, PALETTE } from "../src/dayPart.js";

// SF-ish summer day: sunrise 05:48 (348), sunset 20:33 (1233)
test("partOfDay precedence", () => {
  assert.equal(partOfDay(120, 348, 1233), "night");   // 02:00 pre-morning
  assert.equal(partOfDay(360, 348, 1233), "morning");     // 06:00
  assert.equal(partOfDay(600, 348, 1233), "work");     // 10:00
  assert.equal(partOfDay(540, 348, 1233), "work");     // 09:00 boundary
  assert.equal(partOfDay(1019, 348, 1233), "work");    // 16:59
  assert.equal(partOfDay(1100, 348, 1233), "evening"); // 18:20
  assert.equal(partOfDay(1300, 348, 1233), "night");   // 21:40 after sunset
});

test("winter: sunset before 17:00 → no evening (night after work)", () => {
  // London Dec: sunrise 08:04 (484), sunset 15:53 (953)
  assert.equal(partOfDay(1100, 484, 953), "night");
  assert.equal(partOfDay(700, 484, 953), "work");
  assert.equal(partOfDay(500, 484, 953), "morning");
  assert.equal(partOfDay(400, 484, 953), "night");
});

test("palette has a color for every day-part", () => {
  for (const k of ["night","morning","work","evening"]) assert.match(PALETTE[k], /^#/);
});
