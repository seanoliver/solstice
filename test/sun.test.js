import { test } from "node:test";
import assert from "node:assert/strict";
import { sunTimesUTC } from "../src/sun.js";

const SF = { lat: 37.7749, lon: -122.4194 };
const SYD = { lat: -33.8688, lon: 151.2093 };

test("sunrise is before sunset", () => {
  const { sunrise, sunset } = sunTimesUTC(new Date("2026-05-18T12:00:00Z"), SF.lat, SF.lon);
  assert.ok(sunrise instanceof Date && sunset instanceof Date);
  assert.ok(sunrise.getTime() < sunset.getTime());
});

test("northern hemisphere: summer sunrise earlier (UTC) than winter", () => {
  const jun = sunTimesUTC(new Date("2026-06-21T12:00:00Z"), SF.lat, SF.lon).sunrise;
  const dec = sunTimesUTC(new Date("2026-12-21T12:00:00Z"), SF.lat, SF.lon).sunrise;
  const minOf = (d) => d.getUTCHours() * 60 + d.getUTCMinutes();
  assert.ok(minOf(jun) < minOf(dec), `jun ${minOf(jun)} should be < dec ${minOf(dec)}`);
});

test("southern hemisphere reversed (Sydney): June sunrise later than December", () => {
  const jun = sunTimesUTC(new Date("2026-06-21T12:00:00Z"), SYD.lat, SYD.lon).sunrise;
  const dec = sunTimesUTC(new Date("2026-12-21T12:00:00Z"), SYD.lat, SYD.lon).sunrise;
  const minOf = (d) => d.getUTCHours() * 60 + d.getUTCMinutes();
  assert.ok(minOf(jun) > minOf(dec));
});

test("SF June sunrise ~12:48 UTC within 20 min", () => {
  const r = sunTimesUTC(new Date("2026-06-21T12:00:00Z"), SF.lat, SF.lon).sunrise;
  const min = r.getUTCHours() * 60 + r.getUTCMinutes();
  assert.ok(Math.abs(min - (12 * 60 + 48)) <= 20, `got ${min}`);
});

test("civil dawn and dusk bracket sunrise and sunset by 20-45 minutes at mid latitudes", () => {
  const at = new Date("2026-09-29T12:00:00Z");
  const std = sunTimesUTC(at, 51.5072, -0.1276);
  const civil = sunTimesUTC(at, 51.5072, -0.1276, -6);
  const before = (std.sunrise - civil.sunrise) / 60000;
  const after = (civil.sunset - std.sunset) / 60000;
  assert.ok(before > 20 && before < 45, `dawn lead ${before}`);
  assert.ok(after > 20 && after < 45, `dusk lag ${after}`);
});

test("civil twilight lasts all night in a high-latitude summer", () => {
  const civil = sunTimesUTC(new Date("2026-06-21T12:00:00Z"), 64.1466, -21.9426, -6);
  assert.equal(civil.polar, "day");
});
