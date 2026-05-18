import { test } from "node:test";
import assert from "node:assert/strict";
import { CITIES } from "../cities.js";

test("city dataset is well-formed", () => {
  assert.ok(Array.isArray(CITIES) && CITIES.length >= 40);
  const seen = new Set();
  for (const c of CITIES) {
    assert.ok(c.name && typeof c.name === "string", `name: ${JSON.stringify(c)}`);
    assert.ok(typeof c.lat === "number" && c.lat >= -90 && c.lat <= 90, c.name);
    assert.ok(typeof c.lon === "number" && c.lon >= -180 && c.lon <= 180, c.name);
    assert.doesNotThrow(() =>
      new Intl.DateTimeFormat("en-US", { timeZone: c.tz }), `tz: ${c.name}`);
    const key = c.name + "|" + c.tz;
    assert.ok(!seen.has(key), `duplicate ${key}`);
    seen.add(key);
  }
});
