import { partOfDay } from "./dayPart.js";

// Ordered, merged segments covering [0,1440) → percentages.
export function daySegments(sunriseMin, sunsetMin) {
  const bounds = new Set([0, 1440, 540, 1020]);
  if (sunriseMin > 0 && sunriseMin < 1440) bounds.add(sunriseMin);
  if (sunsetMin  > 0 && sunsetMin  < 1440) bounds.add(sunsetMin);
  const pts = [...bounds].sort((a, b) => a - b);
  const raw = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (b <= a) continue;
    raw.push({ part: partOfDay((a + b) / 2, sunriseMin, sunsetMin), a, b });
  }
  const merged = [];
  for (const seg of raw) {
    const last = merged[merged.length - 1];
    if (last && last.part === seg.part) last.b = seg.b;
    else merged.push({ ...seg });
  }
  return merged.map(s => ({
    part: s.part,
    startPct: (s.a / 1440) * 100,
    widthPct: ((s.b - s.a) / 1440) * 100,
  }));
}

// Gradient stops for a strip: night fades into day from civil dawn to sunrise,
// and back from sunset to civil dusk. Other boundaries stay hard. A null dawn
// or dusk keeps that edge hard.
export function twilightStops(segments, dawnMin, duskMin) {
  const pct = (m) => Math.min(100, Math.max(0, (m / 1440) * 100));
  const stops = [{ part: segments[0].part, pct: 0 }];
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1], seg = segments[i];
    const p = seg.startPct;
    let from = p, to = p;
    if (prev.part === "night" && seg.part !== "night" && dawnMin != null) {
      from = Math.min(p, Math.max(prev.startPct, pct(dawnMin)));
    } else if (prev.part !== "night" && seg.part === "night" && duskMin != null) {
      to = Math.max(p, Math.min(seg.startPct + seg.widthPct, pct(duskMin)));
    }
    stops.push({ part: prev.part, pct: from }, { part: seg.part, pct: to });
  }
  stops.push({ part: segments[segments.length - 1].part, pct: 100 });
  return stops;
}
