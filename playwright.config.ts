import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:4173",
    headless: true,
  },
  webServer: {
    command: "vite preview -c vite.site.config.ts --port 4173",
    port: 4173,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
