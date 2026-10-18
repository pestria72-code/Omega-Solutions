import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:4173";
const useLocalServer = !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  ...(useLocalServer ? {
    webServer: {
      // Use localhost rather than 127.0.0.1 so Neon Auth's localhost origin
      // allowance matches the browser Origin header during local E2E sign-in.
      command: "npm run dev -- --host localhost --port 4173 --strictPort",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_API_BASE_URL: process.env.E2E_API_BASE_URL ?? "http://localhost:3000/api",
        VITE_NEON_AUTH_URL: process.env.E2E_NEON_AUTH_URL ?? "",
      },
    },
  } : {}),
  outputDir: "test-results",
});
