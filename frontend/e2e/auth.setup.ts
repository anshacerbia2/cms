import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "fs";
import { ACCOUNTS, API_URL, type RoleName } from "./support/env";

/**
 * Signs in once per role and saves the browser state, so no spec pays for a
 * login. Runs as its own Playwright project that the others depend on.
 *
 * Deliberately verbose about failure. Everything downstream depends on this
 * step, so a silent timeout here looks like ninety broken tests. Each way it can
 * fail is caught and named instead.
 */
const signIn = (role: RoleName) =>
  setup(`sign in as ${role}`, async ({ page }) => {
    mkdirSync("e2e/.auth", { recursive: true });

    const { email, password } = ACCOUNTS[role];

    // Capture what the browser's own login call did, whatever it was. The app
    // reads its API URL from VITE_API_URL at build time, so this is also how a
    // frontend pointed at the wrong port gets diagnosed.
    const attempts: string[] = [];
    page.on("response", (res) => {
      if (res.url().includes("/auth/login")) attempts.push(`${res.status()} ${res.url()}`);
    });
    page.on("requestfailed", (req) => {
      if (req.url().includes("/auth/login")) {
        attempts.push(`no response from ${req.url()} — ${req.failure()?.errorText}`);
      }
    });

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in|login|masuk/i }).click();

    try {
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    } catch {
      const toast = await page
        .locator("[data-sonner-toast]")
        .first()
        .textContent()
        .catch(() => null);

      throw new Error(
        [
          `Could not sign in as ${email}.`,
          "",
          attempts.length
            ? `The browser's login call: ${attempts.join(", ")}`
            : "The browser never called /auth/login at all — check the form labels.",
          toast ? `The page said: ${toast.trim()}` : "",
          "",
          "Things that produce this:",
          `  · the app is pointed at the wrong API. frontend/.env sets VITE_API_URL,`,
          `    and Vite only reads it at startup — restart pnpm dev after changing it.`,
          `    This suite expects the API at ${API_URL}.`,
          "  · the database has no seeded users — run `npx prisma db seed` in backend/.",
          `  · the password is not "${password}" — set E2E_${role.toUpperCase()}_PASSWORD.`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }

    // The app persists the token under this key; waiting on the URL alone would
    // save state before the write lands.
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("token")), { timeout: 10_000 })
      .not.toBeNull();

    await page.context().storageState({ path: `e2e/.auth/${role}.json` });
  });

signIn("admin");
signIn("viewer");
