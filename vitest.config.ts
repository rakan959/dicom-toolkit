import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: [fileURLToPath(new URL("./tests/setup/canvas.ts", import.meta.url))],
    coverage: {
      provider: "v8",
      thresholds: { lines: 0.8, functions: 0.8, branches: 0.8, statements: 0.8 },
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "vite.config.ts",
        "vite.site.config.ts",
        "site/**",
        "tools/**",
        "coverage/**",
        "CONTRACTS/**",
        "**/index.ts", // barrel files provide no executable logic
      ],
      all: true,
    },
  },
  resolve: {
    alias: {
      "@src": fileURLToPath(new URL("./src", import.meta.url)),
      "@core": fileURLToPath(new URL("./src/core", import.meta.url)),
      "@utils": fileURLToPath(new URL("./src/utils", import.meta.url)),
      "@ui": fileURLToPath(new URL("./src/ui", import.meta.url)),
      "@adapters": fileURLToPath(new URL("./adapters", import.meta.url)),
    },
  },
});
