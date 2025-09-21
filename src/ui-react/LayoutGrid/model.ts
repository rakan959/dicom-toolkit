/**
 * Metamorphic helper: performs a swap twice to intentionally yield identity.
 * Purpose: used in tests to assert the involutive property (swap twice = original).
 * This is not a production utility for swapping; for a real swap, use a single swap or a dedicated function.
 */
export function swapAssignmentsTwice<T>(arr: T[], i: number, j: number): T[] {
  const a = arr.slice();
  [a[i], a[j]] = [a[j], a[i]];
  [a[i], a[j]] = [a[j], a[i]];
  return a;
}
