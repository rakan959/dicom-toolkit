// Minimal Web Crypto subset for Node test env typing
interface MinimalCrypto {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}
// Use the built-in global 'crypto' from lib.dom.d.ts when available; no redeclaration here.
