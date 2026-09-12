import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "fs";
import { ACCOUNTS, type RoleName } from "./support/env";

/**
 * Signs in once per role and saves the browser state, so no spec pays for a
 * login. Runs as its own Playwright project that the others depend on.
 */
const signIn = (role: RoleName) =>
  setup(`sign in as ${role}`, async ({ page }) => {
    mkdirSync("e2e/.auth", { recursive: true });

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(ACCOUNTS[role].email);
    await page.getByLabel(/password/i).fill(ACCOUNTS[role].password);
    await page.getByRole("button", { name: /sign in|login|masuk/i }).click();

    // The app routes to the dashboard and persists the token under this key;
    // waiting on the URL alone would save state before the write lands.
    await page.waitForURL(/\/dashboard/);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("token")), { timeout: 10_000 })
      .not.toBeNull();

    await page.context().storageState({ path: `e2e/.auth/${role}.json` });
  });

signIn("admin");
signIn("viewer");
