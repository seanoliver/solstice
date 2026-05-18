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
