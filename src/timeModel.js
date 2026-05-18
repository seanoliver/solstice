import { partOfDay } from "./dayPart.js";
import { daySegments } from "./bands.js";
import { sunTimesUTC } from "./sun.js";

export function zoneNow(tz, at = new Date()) {
  const base = {};
  if (tz !== "local") base.timeZone = tz;
  // Numeric hour MUST be 24-hour. Do not set hour12 here — hour12 overrides
  // hourCycle, which previously yielded a 12-hour value (7 instead of 19).
  const parts = new Intl.DateTimeFormat("en-US", {
    ...base, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(at);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return {
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    label: new Intl.DateTimeFormat("en-US", {
      ...base, hour: "numeric", minute: "2-digit", hour12: true,
    }).format(at),
  };
}

function minutesInZone(date, tz) {
  const opts = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
  if (tz !== "local") opts.timeZone = tz;
  const p = new Intl.DateTimeFormat("en-US", opts).formatToParts(date);
  const g = (t) => Number(p.find((x) => x.type === t)?.value);
  return g("hour") * 60 + g("minute");
}

function dateLabel(date, tz) {
  const opts = { weekday: "short", month: "short", day: "numeric" };
  if (tz !== "local") opts.timeZone = tz;
  // "Mon, May 18"
  return new Intl.DateTimeFormat("en-US", opts).format(date);
}

function tzAbbrev(date, tz) {
  const opts = { timeZoneName: "short", hour: "numeric" };
  if (tz !== "local") opts.timeZone = tz;
  const p = new Intl.DateTimeFormat("en-US", opts).formatToParts(date);
  return p.find((x) => x.type === "timeZoneName")?.value ?? "";
}

// Integer day number for `date` as observed in `tz` (system-independent).
export function ymdNumber(date, tz) {
  const opts = { year: "numeric", month: "2-digit", day: "2-digit" };
  if (tz !== "local") opts.timeZone = tz;
  const p = new Intl.DateTimeFormat("en-CA", opts).formatToParts(date);
  const g = (t) => Number(p.find((x) => x.type === t)?.value);
  return Math.floor(Date.UTC(g("year"), g("month") - 1, g("day")) / 86400000);
}

// "America/Los_Angeles" → "Los Angeles"; multi-segment uses the last part.
export function cityFromTz(tz) {
  const seg = String(tz).split("/").pop() || String(tz);
  return seg.replace(/_/g, " ");
}

export function buildModel(zones, at = new Date(), localLabel = null) {
  const localNum = ymdNumber(at, "local");
  const localCity = localLabel
    || cityFromTz(new Intl.DateTimeFormat().resolvedOptions().timeZone);
  return zones.map((z) => {
    const { hour, minute, label } = zoneNow(z.tz, at);
    const minutesOfDay = hour * 60 + minute;
    const sun = sunTimesUTC(at, z.lat, z.lon);
    let sunriseMin = 0, sunsetMin = 1440;
    if (sun.sunrise && sun.sunset) {
      sunriseMin = minutesInZone(sun.sunrise, z.tz);
      sunsetMin = minutesInZone(sun.sunset, z.tz);
    } else if (sun.polar === "night") { sunriseMin = 1441; sunsetMin = 1441; }
    const part = partOfDay(minutesOfDay, sunriseMin, sunsetMin);
    return {
      label: z.tz === "local" ? localCity : z.label, tz: z.tz,
      hour, minute, label2: label,
      minutesOfDay, sunriseMin, sunsetMin, part,
      segments: daySegments(sunriseMin, sunsetMin),
      dayProgress: minutesOfDay / 1440,
      dateLabel: dateLabel(at, z.tz),
      tzAbbrev: tzAbbrev(at, z.tz),
      dayOffset: ymdNumber(at, z.tz) - localNum,
    };
  });
}
