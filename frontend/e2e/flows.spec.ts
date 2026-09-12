import { test, expect } from "@playwright/test";
import { Api } from "./support/api";
import { dialog, openPage, row, rowAction, expectToast, acceptConfirm, parseIdr } from "./support/ui";
import { uniq } from "./support/env";

/**
 * The two paths a project can take, walked in the browser from an empty record
 * to a settled invoice. These are the tests worth running when nothing else is.
 *
 * Everything a step depends on is created through the UI here on purpose —
 * elsewhere the API fixture builds preconditions, but the point of this file is
 * that a person can complete the whole journey.
 */

test.describe("Flow A — Regular: project → proposal → WIN → invoice → receive voucher", () => {
  test.describe.configure({ mode: "serial" });

  const projectName = uniq("FLOW-REG");
  let proposalCode = "";
  let invoiceNumber = "";

  test("creates a REGULAR project", async ({ page }) => {
    await openPage(page, "/projects", /projects/i);
    await page.getByRole("button", { name: /ADD PROJECT/i }).click();

    await dialog(page).getByLabel(/project name/i).fill(projectName);
    await dialog(page).getByLabel(/reference/i).fill(uniq("REF"));
    await dialog(page).getByLabel(/contract value/i).fill("100000000");
    await dialog(page).getByLabel(/start date/i).fill("2026-01-01");
    await dialog(page).getByLabel(/end date/i).fill("2026-12-31");
    await dialog(page).getByLabel(/due date/i).fill("2026-11-30");

    await dialog(page).getByLabel(/customer/i).click();
    await page.getByRole("option").first().click();
    await dialog(page).getByLabel(/^type/i).click();
    await page.getByRole("option", { name: /regular/i }).click();

    await dialog(page).locator('button[type="submit"]').click();

    await expect(row(page, projectName)).toBeVisible();
    // The contract value went in unseparated and must come back grouped.
    await expect(row(page, projectName)).toContainText("100.000.000");
  });

  test("attaches a proposal and wins it", async ({ page }) => {
    await openPage(page, "/proposals", /proposals/i);
    await page.getByRole("button", { name: /ADD PROPOSAL/i }).click();

    await dialog(page).getByLabel(/project/i).click();
    await page.getByRole("option", { name: projectName }).click();

    // Model A bills one lump sum; the item rows do not apply.
    await dialog(page).getByLabel(/pricing model/i).click();
    await page.getByRole("option", { name: /^Type A/ }).click();
    await dialog(page).getByLabel(/items total|total amount/i).fill("50000000");

    await dialog(page).locator('button[type="submit"]').click();

    const created = row(page, projectName).first();
    await expect(created).toBeVisible();
    proposalCode = (await created.textContent())?.match(/P-[A-Z0-9-]+/)?.[0] ?? "";
    expect(proposalCode, "proposal code should be generated").not.toBe("");

    await rowAction(page, proposalCode, /edit/i);
    await dialog(page).getByLabel(/^status/i).click();
    await page.getByRole("option", { name: /^win/i }).click();
    await dialog(page).locator('button[type="submit"]').click();

    await expect(row(page, proposalCode)).toContainText(/WIN/);
  });

  test("a won proposal is locked and offers no edit or delete", async ({ page }) => {
    await openPage(page, "/proposals", /proposals/i);
    const menu = await (await import("./support/ui")).openRowMenu(page, proposalCode);

    await expect(menu.getByRole("menuitem", { name: /^edit/i })).toHaveCount(0);
    await expect(menu.getByRole("menuitem", { name: /^delete/i })).toHaveCount(0);
  });

  test("raises an invoice against the won proposal", async ({ page }) => {
    invoiceNumber = uniq("INV");

    await openPage(page, "/invoices", /invoices/i);
    await page.getByRole("button", { name: /ISSUE INVOICE/i }).click();

    await dialog(page).getByLabel(/source/i).click();
    await page.getByRole("option", { name: /proposal/i }).click();
    await dialog(page).getByLabel(/proposal/i).click();
    await page.getByRole("option", { name: proposalCode }).click();

    await dialog(page).getByLabel(/invoice number/i).fill(invoiceNumber);
    await dialog(page).getByLabel(/due date/i).fill("2026-10-31");

    await dialog(page).locator('button[type="submit"]').click();

    await expect(row(page, invoiceNumber)).toBeVisible();
  });

  test("settles it with a receive voucher and the balance falls", async ({ page }) => {
    const api = await Api.signIn();
    const list = await api.get(`/invoices?search=${invoiceNumber}`);
    const invoice = list.data[0];
    const before = Number(invoice.balanceDue);

    await api.createReceiveVoucher([
      { invoiceId: Number(invoice.id), amountApplied: 5_000_000 },
    ]);

    const after = await api.get(`/invoices/${invoice.id}`);
    expect(Number(after.balanceDue)).toBeCloseTo(before - 5_000_000, 2);
    expect(after.paymentStatus).toBe("PARTLY_PAID");
    await api.dispose();

    await openPage(page, "/invoices", /invoices/i);
    await expect(row(page, invoiceNumber)).toContainText(/PARTLY|PARTIAL/i);
  });
});

test.describe("Flow B — FIT: project → invoice → receive voucher, no proposal", () => {
  test.describe.configure({ mode: "serial" });

  const projectName = uniq("FLOW-FIT");
  let invoiceNumber = "";

  test("creates a FIT project", async ({ page }) => {
    await openPage(page, "/projects", /projects/i);
    await page.getByRole("button", { name: /ADD PROJECT/i }).click();

    await dialog(page).getByLabel(/project name/i).fill(projectName);
    await dialog(page).getByLabel(/reference/i).fill(uniq("REF"));
    await dialog(page).getByLabel(/contract value/i).fill("30000000");
    await dialog(page).getByLabel(/start date/i).fill("2026-01-01");
    await dialog(page).getByLabel(/end date/i).fill("2026-12-31");
    await dialog(page).getByLabel(/due date/i).fill("2026-11-30");
    await dialog(page).getByLabel(/customer/i).click();
    await page.getByRole("option").first().click();
    await dialog(page).getByLabel(/^type/i).click();
    await page.getByRole("option", { name: /^fit/i }).click();

    await dialog(page).locator('button[type="submit"]').click();
    await expect(row(page, projectName)).toContainText(/FIT/);
  });

  test("a FIT project cannot carry a proposal", async ({ page }) => {
    const api = await Api.signIn();
    const list = await api.get(`/projects?search=${encodeURIComponent(projectName)}`);
    const refusal = await api.expectRefusal("post", "/proposals", {
      projectId: Number(list.data[0].id),
      pricingModel: "A",
      totalAmountItems: 1_000_000,
    });

    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain("FIT projects bill directly and cannot have proposals");
    await api.dispose();
  });

  test("bills the project directly, entering the amount on the invoice", async ({ page }) => {
    invoiceNumber = uniq("INV");

    await openPage(page, "/invoices", /invoices/i);
    await page.getByRole("button", { name: /ISSUE INVOICE/i }).click();

    await dialog(page).getByLabel(/source/i).click();
    await page.getByRole("option", { name: /fit/i }).click();
    await dialog(page).getByLabel(/project/i).click();
    await page.getByRole("option", { name: projectName }).click();

    await dialog(page).getByLabel(/invoice number/i).fill(invoiceNumber);
    await dialog(page).getByLabel(/due date/i).fill("2026-10-31");
    await dialog(page).getByLabel(/billed amount/i).fill("25000000");

    // No Tax carries no VAT, so the fee is the only uplift.
    await dialog(page).getByLabel(/tax type/i).click();
    await page.getByRole("option", { name: /no tax/i }).click();
    await dialog(page).getByLabel(/management fee/i).fill("5");

    await dialog(page).locator('button[type="submit"]').click();

    const created = row(page, invoiceNumber);
    await expect(created).toBeVisible();
    // 25.000.000 + 5% = 26.250.000, and nothing has been received yet.
    await expect(created).toContainText("26.250.000");
  });

  test("generates exactly one summary sales item", async () => {
    const api = await Api.signIn();
    const list = await api.get(`/invoices?search=${invoiceNumber}`);
    const invoice = await api.get(`/invoices/${list.data[0].id}`);

    expect(invoice.salesItems).toHaveLength(1);
    expect(Number(invoice.salesItems[0].totalPrice)).toBe(25_000_000);
    await api.dispose();
  });

  test("settles to zero and reports FULLY_PAID", async ({ page }) => {
    const api = await Api.signIn();
    const list = await api.get(`/invoices?search=${invoiceNumber}`);
    const invoice = list.data[0];

    await api.createReceiveVoucher([
      { invoiceId: Number(invoice.id), amountApplied: Number(invoice.balanceDue) },
    ]);

    const after = await api.get(`/invoices/${invoice.id}`);
    expect(Number(after.balanceDue)).toBe(0);
    expect(after.paymentStatus).toBe("FULLY_PAID");
    await api.dispose();

    await openPage(page, "/invoices", /invoices/i);
    await expect(row(page, invoiceNumber)).toContainText(/FULLY|PAID/i);
  });

  test("the settled invoice is frozen against edits", async () => {
    const api = await Api.signIn();
    const list = await api.get(`/invoices?search=${invoiceNumber}`);

    for (const [field, patch] of [
      ["tax_type", { taxType: "TAX_WAPU" }],
      ["total_amount", { totalAmount: 99_000_000 }],
    ] as const) {
      const refusal = await api.expectRefusal("patch", `/invoices/${list.data[0].id}`, patch);
      expect(refusal.status, field).toBe(400);
      expect(refusal.message).toContain(field);
    }
    await api.dispose();
  });
});
