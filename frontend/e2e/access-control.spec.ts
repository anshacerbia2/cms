import { test, expect } from "@playwright/test";
import { Api } from "./support/api";
import { dialog, openPage, row } from "./support/ui";
import { uniq } from "./support/env";

/**
 * ACL-15 — creating staff, in the browser.
 *
 * The rule this guards is a rendering one, and the only place it shows is the
 * list: the role column used to print `[object Object]` because the row was
 * handed the role relation instead of its name, and every account read as
 * inactive because the status badge was comparing against the wrong value.
 * Neither is visible from the API, so this one has to go through the page.
 */

test("ACL-15 a new account lists its role by name and its status as ACTIVE", async ({ page }) => {
  const email = `${uniq("staff").toLowerCase()}@local.test`;

  await openPage(page, "/users", /staff management/i);
  await page.getByRole("button", { name: /ADD STAFF/i }).click();

  const form = dialog(page);
  await form.getByLabel(/full name/i).fill("E2E Staff");
  await form.getByLabel(/^email/i).fill(email);
  await form.getByLabel(/^password/i).fill("staffpass1234");

  // Take whichever role the database offers rather than naming one, then hold
  // on to its label: that exact text is what the row has to come back with.
  await form.getByLabel(/^role/i).click();
  const option = page.getByRole("option").filter({ hasNotText: /^No role$/ }).first();
  const roleName = ((await option.textContent()) ?? "").trim();
  expect(roleName, "no roles to assign — run the seeders").not.toBe("");
  await option.click();

  await form.getByLabel(/^status/i).click();
  await page.getByRole("option", { name: /^active$/i }).click();

  await form.locator('button[type="submit"]').click();

  const created = row(page, email);
  await expect(created).toBeVisible();
  await expect(created, "the role column used to print [object Object]").toContainText(roleName);
  await expect(created, "every account used to read as inactive").toContainText("ACTIVE");

  // Clean up through the API: the row's own delete asks through window.confirm
  // and this test is about creation, not removal.
  const api = await Api.signIn();
  const listed = await api.get(`/users?search=${encodeURIComponent(email)}`);
  const match = (listed.data ?? []).find((u: any) => u.email === email);
  if (match) await api.del(`/users/${match.id}`);
  await api.dispose();
});
