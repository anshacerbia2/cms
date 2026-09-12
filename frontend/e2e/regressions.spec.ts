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
  /**
   * Only some P&L rows drill down: the six ledgers in `expenseLedgers`, plus
   * Sales and Cost of Goods, plus expanded level-3 sub-items. A heading row like
   * "Total Expenses" reads as an expense but has no click handler, so a loose
   * text filter lands on one and the modal never opens.
   */
  const DRILLABLE = [
    "Personnel Expense",
    "Office Expense",
    "Marketing Expense",
    "Financial Expense",
    // Sales shares the plain detail table. Cost of Goods is left out on purpose:
    // it renders the COGS column set instead, which has no Description header.
    "Sales",
  ];

  test("the TOTAL row sums only the visible rows", async ({ page }) => {
    await openPage(page, "/finance-reports", /^financial reports$/i);
    await page.getByRole("tab", { name: /profit.*loss/i }).click();

    const modal = dialog(page);
    const total = () => modal.getByRole("row").filter({ hasText: /^TOTAL/ }).first();

    // Take the first drillable ledger this dataset actually has detail for.
    let opened = "";
    for (const account of DRILLABLE) {
      const cell = page
        .getByRole("cell")
        .filter({ hasText: new RegExp(`^\\s*${account}\\s*$`) })
        .first();
      if (!(await cell.count())) continue;

      await cell.click();
      if (await total().isVisible({ timeout: 4000 }).catch(() => false)) {
        opened = account;
        break;
      }
      // Empty or not drillable after all — shut it and try the next.
      await page.keyboard.press("Escape");
      await expect(modal).toBeHidden();
    }
    test.skip(!opened, "no P&L ledger with detail rows in this dataset");

    const unfiltered = parseIdr((await total().textContent()) ?? "");
    const rowsBefore = await modal.getByRole("row").count();

    // The filter trigger is a bare icon button with no accessible name, so reach
    // it through the header it sits in.
    await modal
      .locator("thead th")
      .filter({ hasText: /^Description$/ })
      .locator("button")
      .first()
      .click();

    // nth(0) is "(Select All)". Needing two values below it guarantees the
    // filter leaves at least one row, so the TOTAL row stays rendered.
    const boxes = page.getByRole("checkbox");
    const values = (await boxes.count()) - 1;
    test.skip(values < 2, `${opened} detail has only one Description value to filter on`);

    await boxes.nth(1).uncheck();
    // Escape only closes the dropdown — handleApply runs on OK and nowhere else.
    await page.getByRole("button", { name: /^OK$/ }).click();

    await expect
      .poll(async () => modal.getByRole("row").count())
      .toBeLessThan(rowsBefore);

    await expect(total()).toBeVisible();
    const filtered = parseIdr((await total().textContent()) ?? "");
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
