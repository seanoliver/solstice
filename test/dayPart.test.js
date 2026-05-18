import { test } from "node:test";
import assert from "node:assert/strict";
import { partOfDay, PALETTE } from "../src/dayPart.js";

test("partOfDay buckets hours", () => {
  assert.equal(partOfDay(2),  "asleep");
  assert.equal(partOfDay(7),  "morning");
  assert.equal(partOfDay(12), "work");
  assert.equal(partOfDay(19), "evening");
  assert.equal(partOfDay(23), "night");
});

test("every bucket has a palette color", () => {
  for (const k of ["asleep","morning","work","evening","night"]) {
    assert.match(PALETTE[k], /^#/);
  }
});
