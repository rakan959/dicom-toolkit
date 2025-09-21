/**
 * Fast, conservative DICOM probe from raw bytes without full parsing.
 * Heuristics:
 * - Part 10 preamble 'DICM' at offset 128
 * - Presence of a DICOM UID root string (e.g., 1.2.840.10008) within the first few KB
 *
 * False positives are unlikely; false negatives are possible for exotic data sets, but acceptable for pre-filtering ZIP entries.
 */
export function isDicomQuickProbe(bytes: Uint8Array): boolean {
  if (!bytes || bytes.byteLength <= 0) return false;
  // Check for Part 10 'DICM' marker at offset 128
  if (bytes.byteLength >= 132) {
    const b128 = bytes[128],
      b129 = bytes[129],
      b130 = bytes[130],
      b131 = bytes[131];
    if (b128 === 0x44 && b129 === 0x49 && b130 === 0x43 && b131 === 0x4d) return true;
  }
  // Scan first 8KB for a known DICOM UID root substring
  const scan = bytes.subarray(0, Math.min(bytes.byteLength, 8192));
  try {
    const ascii = new TextDecoder("utf-8", { fatal: false }).decode(scan);
    if (ascii.includes("1.2.840.10008")) return true; // DICOM UID root
    // Common vendor roots (catch more cases while keeping it quick)
    if (/\b1\.2\.(840|276)\.\d/.test(ascii)) return true;
  } catch {
    // ignore decoding issues and fall through
  }
  // Fallback: byte-level ASCII search to be resilient in test environments
  const needleA = new TextEncoder().encode("1.2.840.10008");
  outerA: for (let i = 0; i + needleA.length <= scan.length; i++) {
    for (let j = 0; j < needleA.length; j++) {
      if (scan[i + j] !== needleA[j]) continue outerA;
    }
    return true;
  }
  const needleB = new TextEncoder().encode("1.2.840.");
  outerB: for (let i = 0; i + needleB.length <= scan.length; i++) {
    for (let j = 0; j < needleB.length; j++) {
      if (scan[i + j] !== needleB[j]) continue outerB;
    }
    return true;
  }
  return false;
}
