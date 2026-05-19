import { test } from "node:test";
import assert from "node:assert/strict";
import { gridColumns } from "../src/layout.js";

const WIDE = 1129;   // ~max content width
const NARROW = 360;  // phone-ish

test("≤5 cards on a wide screen → single row of n", () => {
  assert.equal(gridColumns(1, WIDE), 1);
  assert.equal(gridColumns(4, WIDE), 4);
  assert.equal(gridColumns(5, WIDE), 5);
});

test("6 cards on a wide screen → 3 columns (balanced 3×2, no orphan)", () => {
  assert.equal(gridColumns(6, WIDE), 3);
});

test("7→4, 9→5, 11→4 columns (balanced rows, capped at 5)", () => {
  assert.equal(gridColumns(7, WIDE), 4);  // 4+3
  assert.equal(gridColumns(9, WIDE), 5);  // 5+4
  assert.equal(gridColumns(11, WIDE), 4); // 4+4+3
});

test("narrow width caps columns regardless of count", () => {
  assert.equal(gridColumns(6, NARROW), 1); // only ~1 card fits
  const mid = 680;
  assert.equal(gridColumns(6, mid), 3); // medium → 3 wide (the 3×3 look)
});

test("never returns less than 1", () => {
  assert.equal(gridColumns(0, WIDE), 1);
  assert.equal(gridColumns(3, 10), 1);
});
