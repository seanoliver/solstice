export const PALETTE = {
  night:   "#161b22",
  morning: "#c2873f",
  work:    "#2bb3a3",
  evening: "#cf7a3a",
};

// First match wins (agreed precedence). min/sunrise/sunset in minutes-of-day.
export function partOfDay(min, sunriseMin, sunsetMin) {
  if (min >= 540 && min < 1020) return "work";            // 09:00–17:00
  if (sunriseMin <= min && min < 540) return "morning";
  if (min >= 1020 && min < sunsetMin) return "evening";
  return "night";
}

export function dotColor(part) {
  if (part === "night") return "#5b6675"; // dim
  return "#22d3ee";                        // cyan day (morning/work/evening)
}
