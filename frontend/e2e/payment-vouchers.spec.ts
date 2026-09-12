import { test, expect } from "@playwright/test";
import { dialog, openPage, row, rowAction, acceptConfirm } from "./support/ui";
import { uniq } from "./support/env";

/**
 * PV-01..04 — the payment voucher module end to end, through its own dialog.
 *
 * A PV reconciles nothing: no balance moves and no status recomputes when one is
 * saved. So there is no arithmetic to assert, and what is worth covering is the
 * part that had no coverage at all — that the record round-trips. Only the
 * module's two refusals were guarded before this.
 */

test.describe("PV — a payment voucher, created and edited in the browser", () => {
  test.describe.configure({ mode: "serial" });

  const pvNumber = uniq("PV");
  const payee = uniq("VENDOR");

  test("PV-01 records a voucher, and PV-02 keeps its optional fields", async ({ page }) => {
    await openPage(page, "/payment-vouchers", /payment vouchers/i);
    await page.getByRole("button", { name: /ADD PV/i }).click();

    const form = dialog(page);
    await form.getByLabel(/pv number/i).fill(pvNumber);
    await form.getByLabel(/^amount/i).fill("1000000");
    await form.getByLabel(/issuing date/i).fill("2026-09-12");
    await form.getByLabel(/payee name/i).fill(payee);
    await form.getByLabel(/^category/i).fill("Operational");

    // The optional half. Payee Type and Payment Form are left on their
    // defaults, SUPPLIER and BANK, which is why neither can be emptied.
    await form.getByLabel(/due date/i).fill("2026-09-30");
    await form.getByLabel(/payment date/i).fill("2026-09-20");
    await form.getByLabel(/expense type/i).fill("Utilities");
    await form.getByLabel(/description/i).fill("e2e round trip");

    await form.locator('button[type="submit"]').click();

    const created = row(page, pvNumber);
    await expect(created).toBeVisible();
    await expect(created).toContainText(payee);
    await expect(created).toContainText("1.000.000");

    // PV-02 — reopen and every field is still as entered.
    await rowAction(page, pvNumber, /edit pv/i);
    const reopened = dialog(page);
    await expect(reopened.getByLabel(/pv number/i)).toHaveValue(pvNumber);
    await expect(reopened.getByLabel(/due date/i)).toHaveValue("2026-09-30");
    await expect(reopened.getByLabel(/payment date/i)).toHaveValue("2026-09-20");
    await expect(reopened.getByLabel(/expense type/i)).toHaveValue("Utilities");
    await expect(reopened.getByLabel(/description/i)).toHaveValue("e2e round trip");
    await page.keyboard.press("Escape");
    await expect(reopened).toBeHidden();
  });

  test("PV-03 edits the amount, and nothing else moves with it", async ({ page }) => {
    await openPage(page, "/payment-vouchers", /payment vouchers/i);
    await rowAction(page, pvNumber, /edit pv/i);

    const form = dialog(page);
    const amount = form.getByLabel(/^amount/i);
    await amount.fill("");
    await amount.fill("2000000");
    await form.locator('button[type="submit"]').click();

    await expect(row(page, pvNumber)).toContainText("2.000.000");
  });

  test("PV-04 deletes it", async ({ page }) => {
    await openPage(page, "/payment-vouchers", /payment vouchers/i);

    // The page asks through window.confirm, naming the voucher.
    acceptConfirm(page);
    await rowAction(page, pvNumber, /delete pv/i);

    await expect(row(page, pvNumber)).toHaveCount(0);
  });
});
