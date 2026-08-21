/**
 * Column counts for the KPI row, chosen so the last row is never a lone orphan.
 *
 *   1 → full width          4 → 2 × 2
 *   2 → 2 across            5 → 3 + 2
 *   3 → 3 across            6 → 3 × 3 (two rows of three)
 *
 * Seven or more falls back to three across, the widest the cards read well at.
 * Class strings are written out in full so Tailwind can see them.
 */
export function kpiGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  if (count === 4) return "grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";
}
