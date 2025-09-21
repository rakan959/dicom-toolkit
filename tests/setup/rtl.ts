import "@testing-library/jest-dom";

// jsdom doesn't implement IntersectionObserver; provide a minimal stub for tests
if (typeof (globalThis as any).IntersectionObserver === "undefined") {
  class IOStub {
    readonly root: Element | null = null;
    readonly rootMargin: string = "0px";
    readonly thresholds: ReadonlyArray<number> = [0];
    observe(_target: Element) {
      return;
    }
    unobserve(_target: Element) {
      return;
    }
    disconnect() {
      return;
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  (globalThis as any).IntersectionObserver = IOStub as unknown as typeof IntersectionObserver;
}
