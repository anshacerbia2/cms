import { test, expect } from "@playwright/test";
import { Api } from "./support/api";
import {
  dialog,
  openPage,
  row,
  rowAction,
  parseIdr,
  acceptConfirm,
  dialogTab,
} from "./support/ui";

/**
 * REG — repairs, each with a precise "before".
 *
 * These were broken before this branch, so a pass proves the repair rather than
 * the feature. The two purely visual ones (REG-01 and REG-11) are the highest
 * value in the whole suite: nothing else can catch a total that contradicts the
 * rows above it, or a menu item that does nothing.
 */

test.describe("REG-01/02 — P&L detail totals follow the filter", () => {
  test("the TOTAL row sums only the visible rows", async ({ page }) => {
    await openPage(page, "/finance-reports", /financial reports|profit/i);

    // Open the Profit & Loss tab, then drill into a line that has detail rows.
    await page.getByRole("tab", { name: /profit.*loss/i }).click();
    const drillable = page
      .getByRole("row")
      .filter({ hasText: /expense|personnel|salar/i })
      .first();
    test.skip(!(await drillable.count()), "no P&L line with detail in this dataset");
    await drillable.click();

    const modal = dialog(page);
    await expect(modal).toBeVisible();

    const totalCell = modal.getByRole("row").filter({ hasText: /^TOTAL/ }).first();
    await expect(totalCell).toBeVisible();
    const unfiltered = parseIdr((await totalCell.textContent()) ?? "");
    const rowsBefore = await modal.getByRole("row").count();

    // Apply a column filter that removes rows.
    await modal.getByRole("button", { name: /filter/i }).first().click();
    await page.getByRole("checkbox").nth(1).uncheck();
    await page.keyboard.press("Escape");

    await expect
      .poll(async () => modal.getByRole("row").count())
      .toBeLessThan(rowsBefore);

    const filtered = parseIdr((await totalCell.textContent()) ?? "");
    expect(
      filtered,
      "the total used to keep the unfiltered figure and contradict the rows above it",
    ).not.toBe(unfiltered);
  });
});

test.describe("REG-11 — row detail actions open", () => {
  const targets = [
    { path: "/customers", heading: /customers/i, action: /view details/i },
    { path: "/suppliers", heading: /suppliers/i, action: /view profile/i },
    { path: "/products", heading: /products|catalog/i, action: /specifications/i },
  ];

  for (const { path, heading, action } of targets) {
    test(`${path} — ${action.source} opens a detail modal`, async ({ page }) => {
      await openPage(page, path, heading);

      const first = page.getByRole("row").nth(1);
      const label = (await first.textContent())?.trim().slice(0, 18);
      test.skip(!label, `no rows on ${path}`);

      await rowAction(page, label!, action);
      // Each of these three had no handler at all and did nothing when clicked.
      await expect(dialog(page)).toBeVisible();
    });
  }
});

test.describe("REG-09 — product categories are manageable", () => {
  test("add, rename and delete a category from the Products page", async ({ page }) => {
    const name = `E2E-CAT-${Date.now().toString(36)}`;
    await openPage(page, "/products", /products|catalog/i);

    await page.getByRole("button", { name: /categories/i }).click();
    const manager = dialog(page);
    await expect(manager).toBeVisible();

    await manager.getByPlaceholder(/new category name/i).fill(name);
    await manager.getByRole("button", { name: /^add$/i }).click();
    await expect(manager.getByText(name)).toBeVisible();

    // Rename in place.
    const entry = manager.locator("div").filter({ hasText: name }).last();
    await entry.getByRole("button").first().click();
    await manager.locator("input").filter({ hasText: "" }).last().fill(`${name}-R`);
    await page.keyboard.press("Enter");
    await expect(manager.getByText(`${name}-R`)).toBeVisible();

    acceptConfirm(page);
    await manager.locator("div").filter({ hasText: `${name}-R` }).last()
      .getByRole("button").last().click();
    await expect(manager.getByText(`${name}-R`)).toHaveCount(0);
  });
});

test.describe("REG-08 — the banks page still loads after the new :id routes", () => {
  test("every tab under Accounts & Banks renders", async ({ page }) => {
    await openPage(page, "/banks", /accounts|banks/i);

    for (const tab of [/banks/i, /accounts/i, /fiscal/i]) {
      const target = page.getByRole("tab", { name: tab });
      if (!(await target.count())) continue;
      await target.click();
      // A ':id' route declared before the literal path would make
      // /banks/internal-accounts parse "internal-accounts" as an id and 400.
      await expect(page.getByRole("table").or(page.getByText(/no .* found/i))).toBeVisible();
    }
  });
});

test.describe("REG — amount inputs group thousands", () => {
  test("the project contract value formats as you type", async ({ page }) => {
    await openPage(page, "/projects", /projects/i);
    await page.getByRole("button", { name: /ADD PROJECT/i }).click();

    const value = dialog(page).getByLabel(/contract value/i);
    await value.fill("");
    await value.pressSequentially("50000000");

    // It used to be a plain number input and showed 50000000.
    await expect(value).toHaveValue("50.000.000");
  });

  test("the comma is the decimal key, and the dot groups", async ({ page }) => {
    await openPage(page, "/payment-vouchers", /payment vouchers/i);
    await page.getByRole("button", { name: /ADD PV/i }).click();

    const amount = dialog(page).getByLabel(/^amount/i);
    await amount.pressSequentially("1234567,89");
    await expect(amount).toHaveValue("1.234.567,89");
  });

  test("quantities stay unformatted", async ({ page }) => {
    const api = await Api.signIn();
    const project = await api.createProject();
    await api.dispose();

    await openPage(page, "/proposals", /proposals/i);
    await page.getByRole("button", { name: /ADD PROPOSAL/i }).click();
    await dialog(page).getByLabel(/project/i).click();
    await page.getByRole("option", { name: project.name }).click();
    await dialog(page).getByLabel(/pricing model/i).click();
    await page.getByRole("option", { name: /^Type B/ }).click();

    await dialogTab(page, /pricing items/i);
    await dialog(page).getByRole("button", { name: /add item/i }).click();

    const qty = dialog(page).getByLabel(/^qty/i).first();
    await qty.fill("1000");
    // Grouping a count into 1.000 would read as a price.
    await expect(qty).toHaveValue("1000");
  });
});
