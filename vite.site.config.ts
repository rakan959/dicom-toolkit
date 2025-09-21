import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Static demo site build for GitHub Pages
// This is separate from the library build (vite.config.ts)
const base = process.env.GH_PAGES_BASE || "/";

export default defineConfig({
  root: fileURLToPath(new URL("./site", import.meta.url)),
  base,
  plugins: [react()],
  publicDir: fileURLToPath(new URL("./site/public", import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@src": fileURLToPath(new URL("./src", import.meta.url)),
      "@src/ui-react": fileURLToPath(new URL("./src/ui-react", import.meta.url)),
      "@core": fileURLToPath(new URL("./src/core", import.meta.url)),
      "@utils": fileURLToPath(new URL("./src/utils", import.meta.url)),
      "@ui": fileURLToPath(new URL("./src/ui", import.meta.url)),
    },
  },
});
