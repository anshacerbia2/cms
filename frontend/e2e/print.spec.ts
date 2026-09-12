import { test, expect } from "@playwright/test";
import { Api } from "./support/api";
import { openPage, rowAction } from "./support/ui";

/**
 * PRT-02 — the Print action itself.
 *
 * Everything else about printing is asserted against the endpoint, which says
 * nothing about whether the menu item is wired to it. The hook opens a blank tab
 * synchronously on the click — a popup blocker rejects a window opened later
 * from an async callback — then fetches the HTML and writes it in, because the
 * route is behind the JWT guard and window.open would send no Authorization
 * header. So the thing to catch is the popup, and what lands in it.
 */

test("PRT-02 printing an invoice opens a tab carrying the rendered document", async ({ page }) => {
  const api = await Api.signIn();
  const { invoice } = await api.createFitInvoice();
  await api.dispose();

  await openPage(page, "/invoices", /invoices/i);

  const [printed] = await Promise.all([
    page.waitForEvent("popup"),
    rowAction(page, invoice.invoiceNumber, /^print$/i),
  ]);

  // The tab starts on a placeholder and is rewritten once the fetch returns.
  await expect(printed.locator("body")).toContainText(invoice.code, { timeout: 15_000 });
  // 25.000.000 base + 5% fee, No Tax — the same figures PRT-04 checks server side.
  await expect(printed.locator("body")).toContainText("26.250.000,00");
  await expect(
    printed.locator("body"),
    "a failure writes the reason into the tab instead of the document",
  ).not.toContainText(/No active template|Failed to generate/i);

  await printed.close();
});
