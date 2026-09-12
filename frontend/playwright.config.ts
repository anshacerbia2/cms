import { defineConfig, devices } from "@playwright/test";

/**
 * Points at a running dev stack rather than starting one: the API needs its own
 * database and seed, so bringing it up is a deliberate step (see e2e/README.md)
 * instead of something a test run does implicitly.
 */
const UI = process.env.E2E_BASE_URL ?? "http://localhost:5173";

/**
 * Runs on the Chrome already installed on the machine.
 *
 * Playwright would rather ship its own Chromium, pinned to the library version —
 * more reproducible, because system Chrome updates underneath you. But that build
 * is a few hundred megabytes, it has to be re-downloaded on every library bump,
 * and a machine that cannot spare the space cannot run the suite at all. Getting
 * the tests runnable everywhere wins over pinning the browser.
 *
 * CI, where the download is cheap and reproducibility matters more, opts in:
 *
 *   E2E_PINNED_CHROMIUM=1 pnpm e2e      (after `playwright install chromium`)
 */
const browser = process.env.E2E_PINNED_CHROMIUM
  ? devices["Desktop Chrome"]
  : { ...devices["Desktop Chrome"], channel: "chrome" as const };

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
