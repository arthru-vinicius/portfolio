import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta. O `npm run test:e2e` sobe o container local e passa
 * a URL em `E2E_BASE_URL` (ver scripts/run-e2e.mts).
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
