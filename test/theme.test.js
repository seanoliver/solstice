import { test } from "node:test";
import assert from "node:assert/strict";
import { THEMES, normalizeTheme, resolveTheme } from "../src/theme.js";

test("normalizeTheme keeps known preferences and defaults to system", () => {
  for (const t of THEMES) assert.equal(normalizeTheme(t), t);
  assert.equal(normalizeTheme(null), "system");
  assert.equal(normalizeTheme("sepia"), "system");
});

test("resolveTheme follows the system only when the preference is system", () => {
  assert.equal(resolveTheme("system", true), "light");
  assert.equal(resolveTheme("system", false), "dark");
  assert.equal(resolveTheme("light", false), "light");
  assert.equal(resolveTheme("dark", true), "dark");
});
