import { defineConfig, devices } from "@playwright/test";

/**
 * Points at a running dev stack rather than starting one: the API needs its own
 * database and seed, so bringing it up is a deliberate step (see e2e/README.md)
 * instead of something a test run does implicitly.
 */
const UI = process.env.E2E_BASE_URL ?? "http://localhost:5174";

/**
 * Drives the Chrome already on the machine instead of Playwright's pinned
 * Chromium, which it otherwise downloads into a shared cache.
 *
 * Off by default: a pinned Chromium is reproducible, while system Chrome updates
 * underneath you and can change a result with no commit behind it. Worth turning
 * on when the download will not fit, or when the cached build does not match the
 * installed library version — the error names a build number, and switching here
 * skips the fetch entirely.
 *
 *   set E2E_USE_SYSTEM_CHROME=1 && pnpm e2e     (Windows)
 *   E2E_USE_SYSTEM_CHROME=1 pnpm e2e            (macOS, Linux)
 */
const browser = process.env.E2E_USE_SYSTEM_CHROME
  ? { ...devices["Desktop Chrome"], channel: "chrome" as const }
  : devices["Desktop Chrome"];

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.artifacts",

  // Several specs mutate shared records — an invoice's balance, the one active
  // print template — so they cannot run beside each other. Files are still
  // parallel; tests inside a file are serial.
  fullyParallel: false,
  workers: process.env.CI ? 1 : 2,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },

  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "./e2e/.report", open: "never" }]]
    : [["list"]],

  use: {
    baseURL: UI,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    // Amounts render as 52.000.000,00 — pin the locale so a runner in another
    // region does not fail on separators.
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  },

  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/, use: browser },
    {
      name: "admin",
      dependencies: ["setup"],
      use: { ...browser, storageState: "e2e/.auth/admin.json" },
      testIgnore: /viewer\.spec\.ts/,
    },
    {
      name: "viewer",
      dependencies: ["setup"],
      use: { ...browser, storageState: "e2e/.auth/viewer.json" },
      testMatch: /viewer\.spec\.ts/,
    },
  ],
});
