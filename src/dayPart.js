// Band colors are CSS variables so themes can restyle them (see newtab.css).
export const PALETTE = {
  night:   "var(--night)",
  morning: "var(--morning)",
  work:    "var(--work)",
  evening: "var(--evening)",
};

// First match wins (agreed precedence). min/sunrise/sunset in minutes-of-day.
export function partOfDay(min, sunriseMin, sunsetMin) {
  if (min >= 540 && min < 1020) return "work";            // 09:00–17:00
  if (sunriseMin <= min && min < 540) return "morning";
  if (min >= 1020 && min < sunsetMin) return "evening";
  return "night";
}
