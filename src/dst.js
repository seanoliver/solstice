// Upcoming UTC-offset changes (daylight saving) for the zone cards, from the
// browser's own time zone data. No network, no data file.

import { ymdNumber } from "./timeModel.js";

const HOUR = 3600000;
const DAY = 24 * HOUR;
const MINUTE = 60000;
const formatters = new Map();
const cache = new Map();

function offsetFormatter(tz) {
  if (!formatters.has(tz)) {
    const opts = { timeZoneName: "longOffset" };
    if (tz !== "local") opts.timeZone = tz;
    formatters.set(tz, new Intl.DateTimeFormat("en-US", opts));
  }
  return formatters.get(tz);
}

// Minutes east of UTC for `tz` at instant `at` ("GMT+05:45" → 345).
export function offsetMinutes(tz, at) {
  const name = offsetFormatter(tz).formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value ?? "";
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

function findChange(tz, now, days) {
  const start = Math.floor(now.getTime() / MINUTE) * MINUTE;
  const before = offsetMinutes(tz, new Date(start));
  // Offset changes are always weeks apart, so a day step can't skip one.
  for (let t = start + DAY; t <= start + days * DAY; t += DAY) {
    if (offsetMinutes(tz, new Date(t)) === before) continue;
    // Binary search the day for the first minute on the new offset.
    let lo = t - DAY, hi = t;
    while (hi - lo > MINUTE) {
      const mid = lo + Math.floor((hi - lo) / 2 / MINUTE) * MINUTE;
      if (offsetMinutes(tz, new Date(mid)) === before) lo = mid; else hi = mid;
    }
    return { at: new Date(hi), deltaMinutes: offsetMinutes(tz, new Date(hi)) - before };
  }
  return null;
}

// Next offset change for `tz` within `days` of `now`, or null. Cached per
// zone per hour, since the cards re-render far more often than that.
export function nextOffsetChange(tz, now = new Date(), days = 7) {
  const key = `${tz}|${days}|${Math.floor(now.getTime() / HOUR)}`;
  const hit = cache.get(key);
  if (hit !== undefined && (hit === null || hit.at > now)) return hit;
  let change;
  try {
    change = findChange(tz, now, days);
  } catch {
    change = null; // unknown time zone
  }
  cache.set(key, change);
  return change;
}

function amount(minutes) {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60), m = abs % 60;
  return (h ? `${h}h` : "") + (m ? `${m}m` : "");
}

// Chip for a zone card: { text: "−1h in 4d", title: "Clocks go back 1h on Sun, Oct 25" },
// or null when no change is coming within a week.
export function dstBadge(tz, now = new Date()) {
  const change = nextOffsetChange(tz, now);
  if (!change) return null;
  const days = ymdNumber(change.at, tz) - ymdNumber(now, tz);
  const when = days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days}d`;
  const sign = change.deltaMinutes > 0 ? "+" : "−";
  const opts = { weekday: "short", month: "short", day: "numeric" };
  if (tz !== "local") opts.timeZone = tz;
  const date = new Intl.DateTimeFormat("en-US", opts).format(change.at);
  const dir = change.deltaMinutes > 0 ? "forward" : "back";
  return {
    text: `${sign}${amount(change.deltaMinutes)} ${when}`,
    title: `Clocks go ${dir} ${amount(change.deltaMinutes)} on ${date}`,
  };
}
