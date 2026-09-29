import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ACCENTS, normalizeAccent } from "../src/accent.js";

test("normalizeAccent keeps known presets and defaults the rest to teal", () => {
  for (const a of ACCENTS) assert.equal(normalizeAccent(a), a);
  assert.equal(normalizeAccent(null), "teal");
  assert.equal(normalizeAccent("chartreuse"), "teal");
});

test("every preset has dark and light colors in newtab.css", () => {
  const css = readFileSync(new URL("../newtab.css", import.meta.url), "utf8");
  for (const a of ACCENTS) {
    assert.match(css, new RegExp(`^\\[data-accent="${a}"\\] \\{`, "m"), `${a} dark rule`);
    assert.ok(css.includes(`[data-theme="light"][data-accent="${a}"]`), `${a} light rule`);
  }
});
