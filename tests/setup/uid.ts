import * as fc from "fast-check";

/**
 * Deterministic, no-filter UID arbitrary for tests.
 * - 2..9 numeric components, each 0..99999
 * - Joined with '.' ensures length well under 64
 */
export const arbUID = () =>
  fc
    .array(
      fc.integer({ min: 0, max: 99999 }).map((n) => String(n)),
      {
        minLength: 2,
        maxLength: 9,
      },
    )
    .map((parts) => parts.join("."));
