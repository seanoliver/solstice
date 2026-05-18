export const PALETTE = {
  asleep:  "#1b2440",
  morning: "#e8a23d",
  work:    "#f5f0e6",
  evening: "#c4682f",
  night:   "#0e1530",
};

export function partOfDay(hour) {
  if (hour < 6)  return "asleep";
  if (hour < 9)  return "morning";
  if (hour < 18) return "work";
  if (hour < 22) return "evening";
  return "night";
}
