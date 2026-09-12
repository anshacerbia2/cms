import { expect, type Page, type Locator } from "@playwright/test";

/**
 * Selector helpers.
 *
 * The app ships no data-testid attributes, so everything here is built on
 * visible text and ARIA roles. The one rule that matters: reach a row by its
 * document code first, then act inside it. Every row renders an identical
 * unlabelled menu trigger, so an unscoped click lands on whichever row the DOM
 * happens to order first.
 */

/** The table row containing this text — a project code, invoice number, name. */
export const row = (page: Page, text: string | RegExp) =>
  page.getByRole("row").filter({ hasText: text });

/** Opens that row's ⋮ menu. The trigger is the last button in the row. */
export async function openRowMenu(page: Page, text: string | RegExp) {
  const target = row(page, text).first();
  await expect(target, `row "${text}" should be listed`).toBeVisible();
  await target.getByRole("button").last().click();
  return page.getByRole("menu");
}

export async function rowAction(page: Page, text: string | RegExp, action: string | RegExp) {
  const menu = await openRowMenu(page, text);
  await menu.getByRole("menuitem", { name: action }).click();
}

/** The open dialog, whichever it is. */
export const dialog = (page: Page) => page.getByRole("dialog");

/**
 * Several dialogs split their fields across tabs — a proposal's line items, a
 * receive voucher's allocations, an invoice's amounts — and a field on an
 * unselected tab is not in the DOM at all, so it reads as a missing selector
 * rather than a hidden one.
 */
export async function dialogTab(page: Page, name: string | RegExp) {
  await dialog(page).getByRole("tab", { name }).click();
}

/**
 * Collects anything the page throws, so a dialog that dies on mount reports the
 * exception instead of a bare "element not found". Call before the interaction
 * and pass the result into a failure message.
 */
export function capturePageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

/** A form control inside the open dialog, by its visible label. */
export const field = (page: Page, label: string | RegExp) =>
  dialog(page).getByLabel(label);

/**
 * Asserts the sonner toast carries this text. Failures surface the server's own
 * message, so tests assert on the real wording rather than a paraphrase.
 */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}

/** Inline validation from react-hook-form, which renders next to the field. */
export async function expectFieldError(page: Page, message: string | RegExp) {
  await expect(dialog(page).getByText(message).first()).toBeVisible();
}

/** Confirms a destructive action, which the app asks through window.confirm. */
export function acceptConfirm(page: Page) {
  page.once("dialog", (d) => d.accept());
}

export function dismissConfirm(page: Page) {
  page.once("dialog", (d) => d.dismiss());
}

/** `52.000.000,00` → `52000000`. For comparing a cell against an API figure. */
export const parseIdr = (text: string) =>
  Number(text.replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", "."));

/** Waits for a list page to have finished its first fetch. */
export async function openPage(page: Page, path: string, heading: string | RegExp) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

/** Reads the TOTAL row of a table, for the P&L filter scenarios. */
export async function totalsRow(scope: Page | Locator) {
  return scope.getByRole("row").filter({ hasText: /^TOTAL/ }).first();
}
