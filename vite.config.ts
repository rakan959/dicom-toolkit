import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Adjust base for GitHub Pages: "/<REPO>/" when hosted at user.github.io/REPO
const base = process.env.GH_PAGES_BASE || "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    // Enable library build so `vite build` does not require index.html
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      name: "DicomToolkit",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.mjs" : "index.cjs"),
    },
    rollupOptions: {
      // Keep deps external for library consumers
      external: ["dcmjs", "jszip", "zod", "react", "react/jsx-runtime"],
    },
    sourcemap: true,
    emptyOutDir: true,
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
