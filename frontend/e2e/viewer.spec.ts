import { test, expect } from "@playwright/test";
import { openPage, openRowMenu } from "./support/ui";

/**
 * What a read-only role is not offered.
 *
 * These run under the `viewer` Playwright project, which carries the viewer's
 * saved session. The assertion is absence: a control that is merely disabled
 * still tells the user the action exists, so every one of these checks the
 * element is not rendered at all.
 *
 * Note the admin bypass in authStore.can() — it returns true for role `admin`
 * regardless of the permission list, so these gaps are only observable as a
 * non-admin.
 */

const readOnlyPages = [
  { path: "/projects", heading: /projects/i, add: /ADD PROJECT/i },
  { path: "/proposals", heading: /proposals/i, add: /ADD PROPOSAL/i },
  { path: "/invoices", heading: /invoices/i, add: /ISSUE INVOICE/i },
  { path: "/receive-vouchers", heading: /receive vouchers/i, add: /ADD RV/i },
  { path: "/payment-vouchers", heading: /payment vouchers/i, add: /ADD PV/i },
];

for (const { path, heading, add } of readOnlyPages) {
  test(`viewer reads ${path} but is offered no create action`, async ({ page }) => {
    await openPage(page, path, heading);

    // The list itself must still render — read access is the point of the role.
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("button", { name: add })).toHaveCount(0);
  });
}

test("viewer sees no write actions in a row menu", async ({ page }) => {
  await openPage(page, "/projects", /projects/i);

  const firstRow = page.getByRole("row").nth(1);
  const rowText = (await firstRow.textContent())?.trim();
  test.skip(!rowText, "no projects seeded to inspect");

  const menu = await openRowMenu(page, rowText!.slice(0, 20));
  await expect(menu.getByRole("menuitem", { name: /^edit/i })).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name: /^delete|revoke/i })).toHaveCount(0);
});

test("viewer has no Settings group in the sidebar", async ({ page }) => {
  await openPage(page, "/dashboard", /dashboard|welcome/i);

  // Roles, Permissions, Menus and Print Templates are admin-only grants.
  const sidebar = page.getByRole("navigation");
  await expect(sidebar.getByRole("link", { name: /^roles$/i })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: /^permissions$/i })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: /print templates/i })).toHaveCount(0);
});

test("a page the viewer has no permission for refuses its data", async ({ page }) => {
  // Reachable by typing the URL — the route is not permission-gated client side,
  // the data is. The page must not render rows it was refused.
  const refused = page.waitForResponse(
    (res) => res.url().includes("/api/roles") && res.status() === 403,
  );
  await page.goto("/roles");
  await refused;
});
