/**
 * Session-scoped RNG utilities. Use Crypto.getRandomValues.
 */
export class SessionRandom {
  private readonly map = new Map<string, string>();
  constructor(private readonly prefix = "X") {}
  /** Stable per-session mapping for a given original string. */
  mapValue(original: string): string {
    if (!this.map.has(original)) this.map.set(original, this.randomToken());
    return this.map.get(original)!;
  }
  /** Non-deterministic token per call. */
  randomToken(): string {
    const gCrypto: Crypto | undefined = (globalThis as any)?.crypto;
    if (!gCrypto || typeof gCrypto.getRandomValues !== "function") {
      // In non-browser environments, ensure a polyfill provides crypto.getRandomValues
      throw new Error("crypto.getRandomValues is not available in this environment");
    }
    const a = new Uint8Array(16);
    gCrypto.getRandomValues(a);
    return (
      this.prefix +
      Array.from(a)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  }
}
