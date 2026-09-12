import { test, expect } from "@playwright/test";
import { Api } from "./support/api";
import {
  dialog,
  dialogTab,
  expectFieldError,
  openPage,
  capturePageErrors,
} from "./support/ui";

/**
 * VAL — required fields and format rules.
 *
 * Submitting an empty form is the cheapest way to prove a schema is wired up at
 * all, and it is the case a user hits first. Each test asserts the exact message
 * the form renders, so a silently dropped validator fails here rather than
 * surfacing later as a row of nulls.
 *
 * Rules that only the server can decide — a duplicate slug, an over-allocated
 * voucher — live with their module's spec instead.
 */

type Case = { field: string; message: string | RegExp };

/**
 * Every dialog's primary button, whatever it is called. The labels do not follow
 * one verb — projects say Create, vouchers say Record Voucher — and matching on
 * the submit type is both shorter and immune to the next rename.
 */
const submitButton = (page: import("@playwright/test").Page) =>
  dialog(page).locator('button[type="submit"]');

/** Opens the create dialog on a page and submits it untouched. */
async function submitEmpty(page: import("@playwright/test").Page, addButton: string | RegExp) {
  const errors = capturePageErrors(page);
  await page.getByRole("button", { name: addButton }).click();

  try {
    await expect(dialog(page)).toBeVisible();
  } catch {
    throw new Error(
      `The dialog behind ${addButton} never appeared.` +
        (errors.length
          ? `\n\nThe page threw:\n  ${errors.join("\n  ")}`
          : "\n\nThe page threw nothing, so the trigger is wired to something else."),
    );
  }

  await submitButton(page).click();
}

test.describe("VAL — Projects", () => {
  const required: Case[] = [
    { field: "name", message: "Project name is required" },
    { field: "refDocNo", message: "Reference document number is required" },
    { field: "customerId", message: "Customer is required" },
    { field: "value", message: "Contract value is required" },
    { field: "startDate", message: "Start date is required" },
    { field: "endDate", message: "End date is required" },
    { field: "dueDate", message: "Due date is required" },
  ];

  test("VAL-PRJ-01 empty form reports every required field", async ({ page }) => {
    await openPage(page, "/projects", /projects/i);
    await submitEmpty(page, /ADD PROJECT/i);

    for (const { message } of required) {
      await expectFieldError(page, message);
    }
  });

  test("VAL-PRJ-02 description stays optional", async ({ page }) => {
    await openPage(page, "/projects", /projects/i);
    await submitEmpty(page, /ADD PROJECT/i);
    // Nothing may complain about a field the schema marks optional.
    await expect(dialog(page).getByText(/description is required/i)).toHaveCount(0);
  });

  test("VAL-PRJ-03 end date before start date is refused", async ({ page }) => {
    const api = await Api.signIn();
    const refusal = await api.expectRefusal("post", "/projects", {
      name: "VAL end before start",
      refDocNo: "VALDATA-REF-1",
      value: 1_000_000,
      startDate: "2026-06-01",
      endDate: "2026-01-01",
      dueDate: "2026-03-01",
      type: "REGULAR",
      customerId: await api.firstCustomerId(),
    });
    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain("End date must be after start date");
    await api.dispose();
  });

  test("VAL-PRJ-04 due date outside the window is refused", async ({ page }) => {
    const api = await Api.signIn();
    const refusal = await api.expectRefusal("post", "/projects", {
      name: "VAL due outside",
      refDocNo: "VALDATA-REF-2",
      value: 1_000_000,
      startDate: "2026-01-01",
      endDate: "2026-06-01",
      dueDate: "2026-12-31",
      type: "REGULAR",
      customerId: await api.firstCustomerId(),
    });
    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain("Due date must fall between start date and end date");
    await api.dispose();
  });

  test("VAL-PRJ-05 negative contract value is refused", async ({ page }) => {
    const api = await Api.signIn();
    const refusal = await api.expectRefusal("post", "/projects", {
      name: "VAL negative",
      refDocNo: "VALDATA-REF-3",
      value: -1,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      dueDate: "2026-06-01",
      type: "REGULAR",
      customerId: await api.firstCustomerId(),
    });
    expect(refusal.status).toBe(400);
    expect(refusal.message).toMatch(/value must not be less than 0/i);
    await api.dispose();
  });
});

test.describe("VAL — Proposals", () => {
  test("VAL-PRO-01 project is required", async ({ page }) => {
    await openPage(page, "/proposals", /proposals/i);
    await submitEmpty(page, /ADD PROPOSAL/i);
    await expectFieldError(page, "Project is required");
  });

  test("VAL-PRO-02 a line item needs a selling price", async ({ page }) => {
    const api = await Api.signIn();
    const project = await api.createProject();
    await api.dispose();

    await openPage(page, "/proposals", /proposals/i);
    await page.getByRole("button", { name: /ADD PROPOSAL/i }).click();
    await dialog(page).getByLabel(/project/i).click();
    await page.getByRole("option", { name: project.name }).click();

    // Model B bills per line, so the item rows appear and each needs a price.
    await dialog(page).getByLabel(/pricing model/i).click();
    await page.getByRole("option", { name: /^Type B/ }).click();

    await dialogTab(page, /pricing items/i);
    await dialog(page).getByRole("button", { name: /add item/i }).click();
    await submitButton(page).click();

    await expectFieldError(page, /^Required$/);
  });

  test("VAL-PRO-03 model A refuses line items", async () => {
    const api = await Api.signIn();
    const project = await api.createProject();
    const refusal = await api.expectRefusal("post", "/proposals", {
      projectId: Number(project.id),
      pricingModel: "A",
      items: [{ sellingPrice: 10_000_000, qty: 2 }],
    });

    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain("Pricing model A bills a single lump sum");
    await api.dispose();
  });
});

test.describe("VAL — Invoices", () => {
  test("VAL-INV-01 invoice number and due date are required", async ({ page }) => {
    await openPage(page, "/invoices", /invoices/i);
    await submitEmpty(page, /ISSUE INVOICE/i);
    await expectFieldError(page, "Invoice number is required");
    await expectFieldError(page, "Due date is required");
  });

  test("VAL-INV-02 neither proposal nor FIT project is refused", async () => {
    const api = await Api.signIn();
    const refusal = await api.expectRefusal("post", "/invoices", {
      customerId: await api.firstCustomerId(),
      invoiceNumber: "VALDATA-INV-2",
      dueDate: "2026-10-31",
      billingType: "FULL_AMOUNT",
      taxType: "NO_TAX",
      totalAmount: 1_000_000,
    });

    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain("Proposal ID or a valid FIT Project ID is required");
    await api.dispose();
  });

  test("VAL-INV-03 a zero amount is refused", async () => {
    const api = await Api.signIn();
    const project = await api.createProject({ type: "FIT" });
    const refusal = await api.expectRefusal("post", "/invoices", {
      projectId: Number(project.id),
      customerId: await api.firstCustomerId(),
      invoiceNumber: "VALDATA-INV-3",
      dueDate: "2026-10-31",
      billingType: "FULL_AMOUNT",
      taxType: "NO_TAX",
      totalAmount: 0,
    });

    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain("must bill a positive amount");
    await api.dispose();
  });
});

test.describe("VAL — Vouchers", () => {
  test("VAL-RV-01 number, date and amount are required", async ({ page }) => {
    await openPage(page, "/receive-vouchers", /receive vouchers/i);
    await submitEmpty(page, /ADD RV/i);
    await expectFieldError(page, "RV number is required");
    await expectFieldError(page, "RV date is required");
    await expectFieldError(page, "Amount is required");
  });

  test("VAL-RV-02 an allocation row needs an invoice", async ({ page }) => {
    await openPage(page, "/receive-vouchers", /receive vouchers/i);
    await page.getByRole("button", { name: /ADD RV/i }).click();

    await dialogTab(page, /invoice allocation/i);
    await dialog(page).getByRole("button", { name: /add allocation/i }).click();
    await submitButton(page).click();
    await expectFieldError(page, "Pick an invoice");
  });

  test("VAL-RV-03 payment form must be one of the three the API accepts", async () => {
    const api = await Api.signIn();
    const refusal = await api.expectRefusal("post", "/receive-vouchers", {
      rvNumber: "VALDATA-RV-3",
      rvDate: "2026-09-12",
      amount: 1_000_000,
      paymentForm: "TRANSFER",
      payerType: "CUSTOMER",
    });

    expect(refusal.status).toBe(400);
    expect(refusal.message).toMatch(/paymentForm must be one of/i);
    await api.dispose();
  });

  test("VAL-PV-01 every field that can be empty reports itself", async ({ page }) => {
    await openPage(page, "/payment-vouchers", /payment vouchers/i);
    await submitEmpty(page, /ADD PV/i);

    await expectFieldError(page, "PV number is required");
    await expectFieldError(page, "Issuing date is required");
    await expectFieldError(page, "Amount is required");
    await expectFieldError(page, "Category is required");

    // Payee type and payment form are not asserted: the dialog opens with
    // SUPPLIER and BANK already selected, so their required rule cannot be
    // reached through the form. The rule still guards the API — which is where
    // it matters, since the DTO is what a direct caller has to satisfy.
    await expect(dialog(page).getByText("Payee type is required")).toHaveCount(0);
    await expect(dialog(page).getByText("Payment form is required")).toHaveCount(0);
  });

  test("VAL-PV-02 purchase order id is not accepted", async () => {
    const api = await Api.signIn();
    const refusal = await api.expectRefusal("post", "/payment-vouchers", {
      pvNumber: "VALDATA-PV-2",
      issuingDate: "2026-09-12",
      amount: 500_000,
      payableType: "SUPPLIER",
      category: "OPERATIONAL",
      sourcePaymentForm: "TRANSFER",
      purchaseOrderId: 12345,
    });

    expect(refusal.status).toBe(400);
    expect(refusal.message).toMatch(/purchaseOrderId should not exist/i);
    await api.dispose();
  });
});

test.describe("VAL — Access control", () => {
  test("VAL-ACL-01 role name and slug are required", async ({ page }) => {
    await openPage(page, "/roles", /roles/i);
    await submitEmpty(page, /ADD ROLE/i);
    await expectFieldError(page, "Role name is required");
    await expectFieldError(page, "Slug is required");
  });

  test("VAL-ACL-02 slug rejects spaces and capitals", async ({ page }) => {
    await openPage(page, "/roles", /roles/i);
    await page.getByRole("button", { name: /ADD ROLE/i }).click();
    await dialog(page).getByLabel(/role name/i).fill("Finance Manager");
    await dialog(page).getByLabel(/slug/i).fill("Finance Manager");
    await submitButton(page).click();
    await expectFieldError(page, "Use lowercase letters, numbers and dashes only");
  });

  test("VAL-ACL-03 permission route must look like module.action", async ({ page }) => {
    await openPage(page, "/permissions", /permissions/i);
    await page.getByRole("button", { name: /ADD PERMISSION/i }).click();
    await dialog(page).getByLabel(/route/i).fill("Not A Route");
    await submitButton(page).click();
    await expectFieldError(page, /module\.action/);
  });

  test("VAL-ACL-04 menu name is required", async ({ page }) => {
    await openPage(page, "/menus", /menus/i);
    await submitEmpty(page, /ADD MENU/i);
    await expectFieldError(page, "Name is required");
  });

  test("VAL-ACL-05 staff email must be a full address", async ({ page }) => {
    await openPage(page, "/users", /staff/i);
    await page.getByRole("button", { name: /ADD STAFF/i }).click();
    await dialog(page).getByLabel(/full name/i).fill("Val Check");
    await dialog(page).getByLabel(/email/i).fill("admin@localhost");
    await dialog(page).getByLabel(/password/i).fill("longenough123");
    await submitButton(page).click();
    await expectFieldError(page, "Enter a valid email");
  });

  test("VAL-ACL-06 staff password has a floor of eight characters", async ({ page }) => {
    await openPage(page, "/users", /staff/i);
    await page.getByRole("button", { name: /ADD STAFF/i }).click();
    await dialog(page).getByLabel(/full name/i).fill("Val Check");
    await dialog(page).getByLabel(/email/i).fill(`val-${Date.now()}@local.test`);
    await dialog(page).getByLabel(/password/i).fill("short");
    await submitButton(page).click();
    await expectFieldError(page, /at least 8 characters/i);
  });

  test("VAL-ACL-07 a profile edit cannot carry a password", async () => {
    const api = await Api.signIn();
    const users = await api.get("/users?limit=1");
    const refusal = await api.expectRefusal("patch", `/users/${users.data[0].id}`, {
      password: "sneakyreset123",
    });

    expect(refusal.status).toBe(400);
    expect(refusal.message).toMatch(/password should not exist/i);
    await api.dispose();
  });

  test("VAL-ACL-08 change-password requires a matching confirmation", async ({ page }) => {
    const api = await Api.signIn();
    const created = await api.post("/users", {
      name: "Val Confirm",
      email: `val-confirm-${Date.now()}@local.test`,
      password: "initial12345",
    });
    await api.dispose();

    await openPage(page, "/users", /staff/i);
    const { rowAction } = await import("./support/ui");
    await rowAction(page, created.email, /change password/i);
    await dialog(page).getByLabel(/new password/i).fill("brandnew12345");
    await dialog(page).getByLabel(/confirm/i).fill("different12345");
    await dialog(page).getByRole("button", { name: /set password/i }).click();
    await expectFieldError(page, "Passwords do not match");
  });
});

test.describe("VAL — Print templates", () => {
  test("VAL-PRT-01 name and markup are required", async ({ page }) => {
    await openPage(page, "/pdf-templates", /print templates/i);
    await submitEmpty(page, /ADD TEMPLATE/i);
    await expectFieldError(page, "Name is required");
    await expectFieldError(page, "Template markup is required");
  });

  test("VAL-PRT-02 a duplicate name is refused with the name in the message", async ({ page }) => {
    const api = await Api.signIn();
    const active = await api.activeTemplate("INVOICE");
    const refusal = await api.expectRefusal("post", "/pdf-templates", {
      name: active.name,
      type: "INVOICE",
      htmlContent: "<p>{{invoice_code}}</p>",
    });

    expect(refusal.status).toBe(409);
    expect(refusal.message).toContain(active.name);
    await api.dispose();
  });
});

test.describe("VAL — Master data", () => {
  test("VAL-CAT-01 a duplicate category name is refused", async ({ page }) => {
    const api = await Api.signIn();
    const page1 = await api.get("/products/categories");
    const existing = (page1.data ?? page1)[0];
    const refusal = await api.expectRefusal("post", "/products/categories", {
      name: existing.name,
    });

    expect(refusal.status).toBe(409);
    expect(refusal.message).toContain(existing.name);
    await api.dispose();
  });

  test("VAL-BNK-01 a duplicate bank code is refused", async () => {
    const api = await Api.signIn();
    const banks = await api.get("/banks?limit=1");
    const existing = (banks.data ?? banks)[0];
    const refusal = await api.expectRefusal("post", "/banks", {
      bankCode: existing.bankCode,
      bankName: "VAL duplicate",
      bankBrand: "VAL",
    });

    expect(refusal.status).toBe(409);
    expect(refusal.message).toContain(existing.bankCode);
    await api.dispose();
  });
});
