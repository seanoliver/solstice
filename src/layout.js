// Choose how many card columns to show, responsive to BOTH the card count
// and the available width.
//
// - n ≤ max → a single row of n.
// - n > max → split into balanced rows (rows = ceil(n/max)), so there is
//   never a lone orphan card (6 → 3×2, 7 → 4+3, 9 → 5+4, 11 → 4+4+3).
// - Then clamp to however many `min`-width cards actually fit in `avail`.

export function gridColumns(n, avail, opts = {}) {
  const { min = 180, gap = 16, max = 5 } = opts;
  if (n <= 0) return 1;
  const rows = Math.ceil(n / max);
  const countCols = Math.ceil(n / rows); // balanced, ≤ max
  const widthCols = Math.max(1, Math.floor((avail + gap) / (min + gap)));
  return Math.max(1, Math.min(countCols, widthCols, max));
}
