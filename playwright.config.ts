import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  outputDir: "test-results",
  webServer: {
    command: "node tests/server.mjs",
    url: "http://127.0.0.1:4318",
    reuseExistingServer: !process.env.CI,
  },
});
