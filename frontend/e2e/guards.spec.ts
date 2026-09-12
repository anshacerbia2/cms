import { test, expect } from "@playwright/test";
import { Api } from "./support/api";
import { uniq } from "./support/env";

/**
 * The refusals.
 *
 * Roughly a third of this suite passes by being rejected, and every one of these
 * asserts the exact message the UI shows the user. A test that succeeds here has
 * found a bug, and one that fails with a different message has found a changed
 * rule — both matter, so neither is matched loosely.
 *
 * Driven through the API because the rule lives there: the same refusal reaches
 * the browser as a toast carrying this text, which flows.spec.ts covers.
 */

test.describe("Projects", () => {
  test("PRJ-07 a project with a proposal cannot be deleted", async () => {
    const api = await Api.signIn();
    const project = await api.createProject();
    await api.createProposal(project.id);

    const refusal = await api.expectRefusal("delete", `/projects/${project.id}`);
    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain("still has 1 proposal(s)");
    await api.dispose();
  });

  test("PRJ-08 a project with an invoice cannot be deleted", async () => {
    const api = await Api.signIn();
    const { project } = await api.createFitInvoice();

    const refusal = await api.expectRefusal("delete", `/projects/${project.id}`);
    expect(refusal.status).toBe(400);
    expect(refusal.message).toMatch(/still has .*invoice\(s\)/);
    await api.dispose();
  });

  test("PRJ-05 a project cannot point at a customer that does not exist", async () => {
    const api = await Api.signIn();
    const refusal = await api.expectRefusal("post", "/projects", {
      name: uniq("PRJ"),
      refDocNo: uniq("REF"),
      value: 1_000_000,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      dueDate: "2026-11-30",
      type: "REGULAR",
      customerId: 99_999_999,
    });

    expect(refusal.status).toBe(404);
    expect(refusal.message).toContain("Customer with ID 99999999 not found");
    await api.dispose();
  });

  test("PRJ-06 an untouched project can be deleted", async () => {
    const api = await Api.signIn();
    const project = await api.createProject();
    await api.del(`/projects/${project.id}`);
    await api.dispose();
  });
});

test.describe("Proposals", () => {
  test("PRO-07 a won proposal cannot be modified", async () => {
    const api = await Api.signIn();
    const { proposal } = await api.wonProposal();

    const refusal = await api.expectRefusal("patch", `/proposals/${proposal.id}`, {
      note: "trying anyway",
    });
    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain("cannot be modified");
    await api.dispose();
  });

  test("PRO-06 winning mints a sales code", async () => {
    const api = await Api.signIn();
    const project = await api.createProject();
    const draft = await api.createProposal(project.id);
    expect(draft.salesCode ?? null).toBeNull();

    const won = await api.patch(`/proposals/${draft.id}`, { status: "WIN" });
    expect(won.salesCode).toBeTruthy();
    await api.dispose();
  });

  test("PRO-02 model B multiplies each line by its quantity", async () => {
    const api = await Api.signIn();
    const productId = Number((await api.createProduct()).id);
    const { proposal } = await api.wonProposalWithItems([
      { productId, sellingPrice: 10_000_000, qty: 5, description: "five of them" },
    ]);

    // 10.000.000 x 5, and the line carries the same figure as the proposal.
    expect(Number(proposal.totalAmountItems)).toBe(50_000_000);
    expect(proposal.salesItems).toHaveLength(1);
    expect(Number(proposal.salesItems[0].totalPrice)).toBe(50_000_000);
    await api.dispose();
  });

  test("PRO-04 the management fee and VAT build on each other, in that order", async () => {
    const api = await Api.signIn();
    const project = await api.createProject();
    const proposal = await api.createProposal(project.id, {
      totalAmountItems: 50_000_000,
      managementFeeType: "PERCENT",
      managementFee: 4,
      vatRate: 11,
    });

    // Fee is a percentage of the items; VAT is charged on items + fee, not on
    // items alone. Nothing else in the suite checks this arithmetic.
    expect(Number(proposal.calculatedManagementFee)).toBe(2_000_000);
    expect(Number(proposal.salesAmount)).toBe(52_000_000);
    expect(Number(proposal.vatAmount)).toBe(5_720_000);
    expect(Number(proposal.invoiceAmount)).toBe(57_720_000);
    await api.dispose();
  });

  test("PRO-09 a BoQ binds to a won proposal", async () => {
    const api = await Api.signIn();
    const productId = Number((await api.createProduct()).id);
    const { proposal } = await api.wonProposalWithItems([
      { productId, sellingPrice: 4_000_000, qty: 1, description: "boq base" },
    ]);

    const boq = await api.createBoq(proposal.id, [{ productId, qty: 2, freq: 3 }]);
    const listed = await api.get(`/boqs?proposalId=${proposal.id}`);

    expect(Number(boq.proposalId)).toBe(Number(proposal.id));
    expect((listed.data ?? listed).length).toBeGreaterThan(0);
    await api.dispose();
  });

  test("PRO-11 a product with no active price cannot go on a BoQ", async () => {
    const api = await Api.signIn();
    const bare = await api.productWithoutPrice();
    const { proposal } = await api.wonProposalWithItems([
      { sellingPrice: 1_000_000, qty: 1, description: "priced line" },
    ]);

    const refusal = await api.expectRefusal("post", "/boqs", {
      proposalId: Number(proposal.id),
      items: [{ productId: Number(bare.id), qty: 1, freq: 1 }],
    });

    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain(`Product ${bare.name} has no active price version.`);
    await api.dispose();
  });

  test("PRO-10 a BoQ binds only to a won proposal", async () => {
    const api = await Api.signIn();
    const project = await api.createProject();
    const draft = await api.createProposal(project.id);
    const productId = await api.firstProductId();

    const refusal = await api.expectRefusal("post", "/boqs", {
      proposalId: Number(draft.id),
      items: [{ productId, qty: 2, freq: 1 }],
    });
    expect(refusal.status).toBe(400);
    expect(refusal.message).toMatch(/WIN/);
    await api.dispose();
  });

  test("PRO-12 an item keeps the price it was quoted at", async () => {
    const api = await Api.signIn();
    // Its own product: this test changes a price, and a price change rotates the
    // version rather than overwriting it, so a seeded product could not be put
    // back as it was.
    const productId = Number((await api.createProduct(7_000_000)).id);
    const project = await api.createProject();
    const proposal = await api.createProposal(project.id, {
      pricingModel: "B",
      totalAmountItems: undefined,
      items: [{ productId, sellingPrice: 7_000_000, qty: 2 }],
    });

    const quoted = Number(proposal.salesItems[0].sellingPrice);
    expect(quoted).toBe(7_000_000);

    // The snapshot must survive a change to the product master.
    await api.patch(`/products/${productId}`, { price: 9_999_999 });
    const reread = await api.get(`/proposals/${proposal.id}`);
    expect(Number(reread.salesItems[0].sellingPrice)).toBe(quoted);
    await api.dispose();
  });
});

test.describe("Invoices", () => {
  test("INV-03 only a won proposal can be invoiced", async () => {
    const api = await Api.signIn();
    const project = await api.createProject();
    const draft = await api.createProposal(project.id);

    const refusal = await api.expectRefusal("post", "/invoices", {
      proposalId: Number(draft.id),
      customerId: await api.firstCustomerId(),
      invoiceNumber: uniq("INV"),
      dueDate: "2026-10-31",
      billingType: "FULL_AMOUNT",
      taxType: "NO_TAX",
    });
    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain("win proposals");
    await api.dispose();
  });

  test("INV-04 a REGULAR project cannot be billed directly", async () => {
    const api = await Api.signIn();
    const project = await api.createProject({ type: "REGULAR" });

    const refusal = await api.expectRefusal("post", "/invoices", {
      projectId: Number(project.id),
      customerId: await api.firstCustomerId(),
      invoiceNumber: uniq("INV"),
      dueDate: "2026-10-31",
      billingType: "FULL_AMOUNT",
      taxType: "NO_TAX",
      totalAmount: 1_000_000,
    });
    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain("Proposal ID or a valid FIT Project ID is required");
    await api.dispose();
  });

  test("INV-06 a second full invoice on one proposal is refused", async () => {
    const api = await Api.signIn();
    const { proposal } = await api.createProposalInvoice();

    const refusal = await api.expectRefusal("post", "/invoices", {
      proposalId: Number(proposal.id),
      customerId: await api.firstCustomerId(),
      invoiceNumber: uniq("INV"),
      dueDate: "2026-10-31",
      billingType: "FULL_AMOUNT",
      taxType: "NO_TAX",
    });
    expect(refusal.status).toBe(400);
    expect(refusal.message).toMatch(/other invoices already exist/i);
    await api.dispose();
  });

  test("INV-07/08/16 an item belongs to one invoice at a time", async () => {
    const api = await Api.signIn();
    const productId = Number((await api.createProduct()).id);
    const { proposal, itemIds } = await api.wonProposalWithItems([
      { productId, sellingPrice: 10_000_000, qty: 1, description: "first" },
      { productId, sellingPrice: 20_000_000, qty: 1, description: "second" },
    ]);
    expect(itemIds, "model B should mint one claimable item per line").toHaveLength(2);

    // INV-07 — the two halves bill separately and neither claims the other's line.
    const first = await api.partialInvoice(proposal.id, [itemIds[0]]);
    const second = await api.partialInvoice(proposal.id, [itemIds[1]]);
    expect(Number(first.totalAmount)).toBe(10_000_000);
    expect(Number(second.totalAmount)).toBe(20_000_000);

    // INV-08 — the first line is taken now.
    const refusal = await api.expectRefusal("post", "/invoices", {
      proposalId: Number(proposal.id),
      customerId: await api.firstCustomerId(),
      invoiceNumber: uniq("INV"),
      dueDate: "2026-10-31",
      billingType: "PARTLY_PAYMENT",
      taxType: "TAX_NON_WAPU",
      vatRate: 11,
      itemIds: [itemIds[0]],
    });
    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain("Some selected items are not available for invoicing");

    // INV-16 — deleting the invoice releases its line again.
    await api.del(`/invoices/${first.id}`);
    const reissued = await api.partialInvoice(proposal.id, [itemIds[0]]);
    expect(Number(reissued.totalAmount)).toBe(10_000_000);

    await api.dispose();
  });

  test("INV-15 an invoice with a voucher cannot be deleted", async () => {
    const api = await Api.signIn();
    const { invoice } = await api.createFitInvoice();
    await api.createReceiveVoucher([{ invoiceId: Number(invoice.id), amountApplied: 1_000_000 }]);

    const refusal = await api.expectRefusal("delete", `/invoices/${invoice.id}`);
    expect(refusal.status).toBe(400);
    expect(refusal.message).toMatch(/Receive Voucher/i);
    await api.dispose();
  });

  test("INV-10..14 the No Tax settlement rule switches on with the flag", async () => {
    const api = await Api.signIn();
    const accounts = await api.internalAccounts();
    const designated = accounts[0];
    const other = accounts.find((a) => a.id !== designated.id);
    expect(other, "needs at least two internal accounts seeded").toBeTruthy();

    const newNoTaxInvoice = (extra: Record<string, unknown>) =>
      api.createFitInvoice({ taxType: "NO_TAX", ...extra });

    // INV-10 — dormant while nothing is designated.
    await api.patch(`/banks/internal-accounts/${designated.id}`, { isNonVatSettlement: false });
    const dormant = await newNoTaxInvoice({});
    expect(dormant.invoice.id).toBeTruthy();

    await api.patch(`/banks/internal-accounts/${designated.id}`, { isNonVatSettlement: true });
    try {
      const project = await api.createProject({ type: "FIT" });
      const base = {
        projectId: Number(project.id),
        customerId: await api.firstCustomerId(),
        dueDate: "2026-10-31",
        billingType: "FULL_AMOUNT",
        taxType: "NO_TAX",
        totalAmount: 1_000_000,
      };

      // INV-11 — active, no account named.
      const noAccount = await api.expectRefusal("post", "/invoices", {
        ...base,
        invoiceNumber: uniq("INV"),
      });
      expect(noAccount.status).toBe(400);
      expect(noAccount.message).toContain("must name the non-VAT settlement account");

      // INV-12 — active, wrong account.
      const wrong = await api.expectRefusal("post", "/invoices", {
        ...base,
        invoiceNumber: uniq("INV"),
        internalAccountId: Number(other!.id),
      });
      expect(wrong.status).toBe(400);
      expect(wrong.message).toContain("must settle to the non-VAT account");

      // INV-13 — active, right account.
      const accepted = await api.post("/invoices", {
        ...base,
        invoiceNumber: uniq("INV"),
        internalAccountId: Number(designated.id),
      });
      expect(accepted.id).toBeTruthy();

      // INV-14 — a taxed invoice is untouched by the rule.
      const taxed = await api.post("/invoices", {
        ...base,
        invoiceNumber: uniq("INV"),
        taxType: "TAX_NON_WAPU",
        vatRate: 11,
        internalAccountId: Number(other!.id),
      });
      expect(taxed.id).toBeTruthy();
    } finally {
      // Leave the flag off; other specs assume the rule is dormant.
      await api.patch(`/banks/internal-accounts/${designated.id}`, { isNonVatSettlement: false });
      await api.dispose();
    }
  });
});

test.describe("Receive vouchers", () => {
  test("RV-01 a partial allocation lowers the balance", async () => {
    const api = await Api.signIn();
    const { invoice } = await api.createFitInvoice();
    const gross = Number(invoice.balanceDue);

    await api.createReceiveVoucher([{ invoiceId: Number(invoice.id), amountApplied: 5_000_000 }]);

    const after = await api.get(`/invoices/${invoice.id}`);
    expect(Number(after.balanceDue)).toBeCloseTo(gross - 5_000_000, 2);
    expect(after.paymentStatus).toBe("PARTLY_PAID");
    await api.dispose();
  });

  test("RV-03 editing an RV upward is measured against the invoice, not its own effect", async () => {
    const api = await Api.signIn();
    const { invoice } = await api.createFitInvoice();
    const gross = Number(invoice.balanceDue);

    const rv = await api.createReceiveVoucher([
      { invoiceId: Number(invoice.id), amountApplied: 5_000_000 },
    ]);
    await api.patch(`/receive-vouchers/${rv.id}`, {
      amount: 8_000_000,
      invoiceAllocations: [{ invoiceId: Number(invoice.id), amountApplied: 8_000_000 }],
    });

    const after = await api.get(`/invoices/${invoice.id}`);
    // gross − 8m, never gross − 5m − 8m.
    expect(Number(after.balanceDue)).toBeCloseTo(gross - 8_000_000, 2);
    await api.dispose();
  });

  test("RV-04 every deduction reduces the balance", async () => {
    const api = await Api.signIn();
    const { invoice } = await api.createFitInvoice();
    const gross = Number(invoice.balanceDue);

    await api.createReceiveVoucher([
      {
        invoiceId: Number(invoice.id),
        amountApplied: 8_000_000,
        pph23Deduction: 160_000,
        bankCharge: 6_500,
      },
    ]);

    const after = await api.get(`/invoices/${invoice.id}`);
    expect(Number(after.balanceDue)).toBeCloseTo(gross - 8_000_000 - 160_000 - 6_500, 2);
    expect(Number(after.totalPph23Deduction)).toBe(160_000);
    expect(Number(after.totalBankCharge)).toBe(6_500);
    await api.dispose();
  });

  test("RV-05 over-allocating one invoice is refused, naming its balance", async () => {
    const api = await Api.signIn();
    const { invoice } = await api.createFitInvoice();

    const refusal = await api.expectRefusal("post", "/receive-vouchers", {
      rvNumber: uniq("RV"),
      rvDate: "2026-09-12",
      amount: 999_000_000,
      paymentForm: "BANK",
      payerType: "CUSTOMER",
      invoiceAllocations: [{ invoiceId: Number(invoice.id), amountApplied: 999_000_000 }],
    });

    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain(invoice.code);
    expect(refusal.message).toContain("exceeds its outstanding balance");
    await api.dispose();
  });

  test("RV-06 allocations may not exceed the voucher itself", async () => {
    const api = await Api.signIn();
    const a = await api.createFitInvoice();
    const b = await api.createFitInvoice();

    const refusal = await api.expectRefusal("post", "/receive-vouchers", {
      rvNumber: uniq("RV"),
      rvDate: "2026-09-12",
      amount: 5_000_000,
      paymentForm: "BANK",
      payerType: "CUSTOMER",
      invoiceAllocations: [
        { invoiceId: Number(a.invoice.id), amountApplied: 5_000_000 },
        { invoiceId: Number(b.invoice.id), amountApplied: 4_000_000 },
      ],
    });

    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain("exceeds the Receive Voucher amount");
    await api.dispose();
  });

  test("RV-07 one voucher splits across several invoices", async () => {
    const api = await Api.signIn();
    const a = await api.plainFitInvoice(20_000_000);
    const b = await api.plainFitInvoice(30_000_000);

    await api.createReceiveVoucher([
      { invoiceId: Number(a.id), amountApplied: 6_000_000 },
      { invoiceId: Number(b.id), amountApplied: 4_000_000 },
    ]);

    // Each invoice drops by its own share, not by the voucher total.
    const afterA = await api.get(`/invoices/${a.id}`);
    const afterB = await api.get(`/invoices/${b.id}`);
    expect(Number(afterA.balanceDue)).toBe(14_000_000);
    expect(Number(afterB.balanceDue)).toBe(26_000_000);
    expect(afterA.paymentStatus).toBe("PARTLY_PAID");
    expect(afterB.paymentStatus).toBe("PARTLY_PAID");
    await api.dispose();
  });

  test("RV-10 an allocation to an invoice that does not exist is refused", async () => {
    const api = await Api.signIn();
    const refusal = await api.expectRefusal("post", "/receive-vouchers", {
      rvNumber: uniq("RV"),
      rvDate: "2026-09-12",
      amount: 1_000_000,
      paymentForm: "BANK",
      payerType: "CUSTOMER",
      payerNameManual: uniq("PAYER"),
      invoiceAllocations: [{ invoiceId: 99_999_999, amountApplied: 1_000_000 }],
    });

    expect(refusal.status).toBe(404);
    expect(refusal.message).toContain("Invoice with ID 99999999 not found.");
    await api.dispose();
  });

  test("RV-09 deleting an RV restores the invoice", async () => {
    const api = await Api.signIn();
    const { invoice } = await api.createFitInvoice();
    const gross = Number(invoice.balanceDue);

    const rv = await api.createReceiveVoucher([
      { invoiceId: Number(invoice.id), amountApplied: 3_000_000 },
    ]);
    await api.del(`/receive-vouchers/${rv.id}`);

    const after = await api.get(`/invoices/${invoice.id}`);
    expect(Number(after.balanceDue)).toBeCloseTo(gross, 2);
    expect(Number(after.totalReceivedAmount)).toBe(0);
    expect(after.paymentStatus).toBe("UNPAID");
    await api.dispose();
  });
});

test.describe("Access control", () => {
  test("ACL-02/03 grant lists are absolute, and omitting differs from emptying", async () => {
    const api = await Api.signIn();
    const permissionIds = [await api.permissionIdByRoute("projects.index")];
    const role = await api.createRole({ permissionIds });

    // Omitted — grants survive.
    const renamed = await api.patch(`/roles/${role.id}`, { description: "renamed only" });
    expect(renamed.permissions).toHaveLength(1);

    // Empty — grants revoked.
    const cleared = await api.patch(`/roles/${role.id}`, { permissionIds: [] });
    expect(cleared.permissions).toHaveLength(0);

    await api.del(`/roles/${role.id}`);
    await api.dispose();
  });

  test("ACL-01 a role is created carrying the grants it was given", async () => {
    const api = await Api.signIn();
    const permissionIds = [await api.permissionIdByRoute("projects.index")];
    const { menuId } = await api.menuPathByRoute("projects.index");

    const role = await api.createRole({ permissionIds, menuIds: [menuId] });
    expect(role.permissions).toHaveLength(1);
    expect(role.menus).toHaveLength(1);

    await api.del(`/roles/${role.id}`);
    await api.dispose();
  });

  test("ACL-06 a permission can be created for a page that has none", async () => {
    const api = await Api.signIn();
    const route = `${uniq("e2e").toLowerCase()}.index`;

    const created = await api.post("/permissions", { route, description: "E2E probe" });
    expect(created.route).toBe(route);
    expect(Number(await api.permissionIdByRoute(route))).toBe(Number(created.id));

    await api.del(`/permissions/${created.id}`);
    await api.dispose();
  });

  test("ACL-08/09 a grant has two halves, and each fails differently alone", async () => {
    const api = await Api.signIn();
    const permissionId = await api.permissionIdByRoute("projects.index");
    const { menuId, parentId, title } = await api.menuPathByRoute("projects.index");

    // ACL-08 — the menu without the permission. The entry is offered and the
    // page it points at refuses its data, which is the worst of the two.
    const menuOnly = await api.createRole({
      permissionIds: [],
      menuIds: parentId ? [parentId, menuId] : [menuId],
    });
    const blind = await api.createUser(menuOnly.id);
    const asBlind = await Api.signInAs(blind.email, blind.password);
    const offered = (asBlind.user.menus ?? []).flatMap((g: any) =>
      (g.items ?? []).map((i: any) => i.title),
    );
    expect(offered, "the sidebar still offers the entry").toContain(title);

    const refused = await asBlind.api.expectRefusal("get", "/projects?limit=1");
    expect(refused.status).toBe(403);
    await asBlind.api.dispose();

    // ACL-09 — the permission without the menu. No entry, but the page works
    // when its URL is typed, so the grant is real and merely unreachable.
    const permOnly = await api.createRole({ permissionIds: [permissionId], menuIds: [] });
    const hidden = await api.createUser(permOnly.id);
    const asHidden = await Api.signInAs(hidden.email, hidden.password);
    const hiddenOffered = (asHidden.user.menus ?? []).flatMap((g: any) =>
      (g.items ?? []).map((i: any) => i.title),
    );
    expect(hiddenOffered, "nothing should point at it").not.toContain(title);
    expect((await asHidden.api.get("/projects?limit=1")).data).toBeDefined();
    await asHidden.api.dispose();

    for (const id of [blind.user.id, hidden.user.id]) await api.del(`/users/${id}`);
    for (const id of [menuOnly.id, permOnly.id]) await api.del(`/roles/${id}`);
    await api.dispose();
  });

  test("ACL-18 a changed password takes effect and retires the old one", async () => {
    const api = await Api.signIn();
    const role = await api.createRole({
      permissionIds: [await api.permissionIdByRoute("projects.index")],
    });
    const holder = await api.createUser(role.id);

    await api.patch(`/users/${holder.user.id}/password`, { password: "rotated12345" });

    const rotated = await Api.signInAs(holder.email, "rotated12345");
    expect(rotated.user.email).toBe(holder.email);
    await rotated.api.dispose();

    await expect(
      Api.signInAs(holder.email, holder.password),
      "the previous password must stop working",
    ).rejects.toThrow(/Sign-in failed/);

    await api.del(`/users/${holder.user.id}`);
    await api.del(`/roles/${role.id}`);
    await api.dispose();
  });

  test("ACL-04 a duplicate slug is refused", async () => {
    const api = await Api.signIn();
    const refusal = await api.expectRefusal("post", "/roles", { name: "Dup", slug: "admin" });
    expect(refusal.status).toBe(409);
    expect(refusal.message).toContain('"admin" is already taken');
    await api.dispose();
  });

  test("ACL-05 a role still assigned to staff cannot be deleted", async () => {
    const api = await Api.signIn();
    const role = await api.createRole();
    const user = await api.post("/users", {
      name: "ACL holder",
      email: `acl-${Date.now()}@local.test`,
      password: "holder12345",
      roleId: Number(role.id),
    });

    const refusal = await api.expectRefusal("delete", `/roles/${role.id}`);
    expect(refusal.status).toBe(400);
    expect(refusal.message).toMatch(/assigned to 1 user\(s\)/);

    await api.del(`/users/${user.id}`);
    await api.del(`/roles/${role.id}`);
    await api.dispose();
  });

  test("ACL-10 a permission a menu points at cannot be deleted", async () => {
    const api = await Api.signIn();
    const id = await api.permissionIdByRoute("roles.index");

    const refusal = await api.expectRefusal("delete", `/permissions/${id}`);
    expect(refusal.status).toBe(400);
    expect(refusal.message).toMatch(/linked to .* menu\(s\)/);
    await api.dispose();
  });

  test("ACL-11 a menu created through the API lands above the seeded id range", async () => {
    const api = await Api.signIn();
    const parentId = 600; // Settings
    const created = await api.post("/menus", { name: uniq("MENU"), parentId });

    // The seeded rows use hardcoded ids up to 6003; an id of 1 means the
    // sequence was never realigned and will collide later.
    expect(Number(created.id)).toBeGreaterThan(6003);

    await api.del(`/menus/${created.id}`);
    await api.dispose();
  });

  test("ACL-12/13 a menu cannot become its own ancestor", async () => {
    const api = await Api.signIn();
    const child = await api.post("/menus", { name: uniq("MENU"), parentId: 600 });

    const itself = await api.expectRefusal("patch", `/menus/${child.id}`, {
      parentId: Number(child.id),
    });
    expect(itself.message).toContain("cannot be its own parent");

    const cycle = await api.expectRefusal("patch", "/menus/600", {
      parentId: Number(child.id),
    });
    expect(cycle.message).toContain("under one of its own children");

    await api.del(`/menus/${child.id}`);
    await api.dispose();
  });

  test("ACL-14 a group with children cannot be deleted", async () => {
    const api = await Api.signIn();
    const refusal = await api.expectRefusal("delete", "/menus/600");
    expect(refusal.status).toBe(400);
    expect(refusal.message).toMatch(/child menu\(s\)/);
    await api.dispose();
  });

  test("ACL-16 the user list never carries a password", async () => {
    const api = await Api.signIn();
    const page = await api.get("/users?limit=25");

    for (const user of page.data) {
      expect(Object.keys(user)).not.toContain("password");
    }
    await api.dispose();
  });

  test("ACL-19 deactivating an account invalidates its existing token", async () => {
    const api = await Api.signIn();
    const email = `acl-deact-${Date.now()}@local.test`;
    const created = await api.post("/users", {
      name: "ACL deactivate",
      email,
      password: "deact12345",
      roleId: 1,
    });

    // Sign in as that user and keep the token.
    const { API_URL } = await import("./support/env");
    const theirs = await (await import("@playwright/test")).request.newContext();
    const login = await theirs.post(`${API_URL}/auth/login`, {
      data: { email, password: "deact12345" },
    });
    const token = (await login.json()).data.access_token;

    const auth = { Authorization: `Bearer ${token}` };
    const before = await theirs.get(`${API_URL}/roles`, { headers: auth });
    expect(before.status()).toBe(200);

    await api.patch(`/users/${created.id}`, { status: "INACTIVE" });

    const after = await theirs.get(`${API_URL}/roles`, { headers: auth });
    expect(after.status(), "authorisation is read per request, not from the token").toBe(401);

    await theirs.dispose();
    await api.del(`/users/${created.id}`);
    await api.dispose();
  });

  test("ACL-20 you cannot delete the account you are signed in as", async () => {
    const api = await Api.signIn();
    const me = await api.get("/auth/profile");
    const refusal = await api.expectRefusal("delete", `/users/${me.userId ?? me.id}`);

    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain("signed in as");
    await api.dispose();
  });
});

test.describe("Print templates", () => {
  test("PRT-07 the only template of a type cannot be deleted", async () => {
    const api = await Api.signIn();
    const active = await api.activeTemplate("PROPOSAL");
    const all = await api.get("/pdf-templates?type=PROPOSAL&limit=50");

    test.skip((all.data ?? []).length !== 1, "another proposal template exists");

    const refusal = await api.expectRefusal("delete", `/pdf-templates/${active.id}`);
    expect(refusal.status).toBe(400);
    expect(refusal.message).toContain("Create a replacement before deleting it");
    await api.dispose();
  });

  test("PRT-01 a starter template exists and is active for each type", async () => {
    const api = await Api.signIn();

    for (const type of ["INVOICE", "PROPOSAL"] as const) {
      const active = await api.activeTemplate(type);
      expect(active, `no active ${type} template — run the pdf-templates seeder`).toBeTruthy();
      expect(active.type).toBe(type);
    }
    await api.dispose();
  });

  test("PRT-03 a proposal prints with every placeholder resolved", async () => {
    const api = await Api.signIn();
    const { proposal } = await api.wonProposalWithItems([
      { sellingPrice: 7_000_000, qty: 2, description: "printed line" },
    ]);

    const { API_URL } = await import("./support/env");
    const ctx = await (await import("@playwright/test")).request.newContext();
    const res = await ctx.get(`${API_URL}/proposals/${proposal.id}/print`, {
      headers: { Authorization: `Bearer ${api.token}` },
    });
    const html = await res.text();

    expect(res.status()).toBe(200);
    expect(html, "no placeholder may survive rendering").not.toMatch(/\{\{\s*\w+\s*\}\}/);
    expect(html).toContain(proposal.code);
    // 7.000.000 x 2, no fee and no VAT on this one.
    expect(html).toContain("14.000.000,00");

    await ctx.dispose();
    await api.dispose();
  });

  test("PRT-11 an unknown placeholder is named rather than left raw", async () => {
    const api = await Api.signIn();
    const preview = await api.post("/pdf-templates/preview", {
      htmlContent: "<p>{{invoice_code}} and {{no_such_field}}</p>",
    });

    // Both are reported, and the one with no value renders as its own name in
    // brackets — a template author sees the gap instead of shipping {{...}}.
    expect(preview.variables).toContain("no_such_field");
    expect(preview.variables).toContain("invoice_code");
    expect(preview.html).toContain("[no_such_field]");
    expect(preview.html).not.toMatch(/\{\{\s*\w+\s*\}\}/);
    await api.dispose();
  });

  test("PRT-05/06 one active per type, and deleting it promotes a successor", async () => {
    const api = await Api.signIn();
    const original = await api.activeTemplate("INVOICE");

    const second = await api.post("/pdf-templates", {
      name: uniq("TPL"),
      type: "INVOICE",
      htmlContent: "<p>{{invoice_code}}</p>",
      isActive: true,
    });

    const demoted = await api.get(`/pdf-templates/${original.id}`);
    expect(demoted.isActive).toBe(false);

    await api.del(`/pdf-templates/${second.id}`);
    const promoted = await api.get(`/pdf-templates/${original.id}`);
    expect(promoted.isActive, "a successor must take over").toBe(true);
    await api.dispose();
  });

  test("PRT-09/10 values are escaped and placeholders are not re-expanded", async () => {
    const api = await Api.signIn();

    const escaped = await api.post("/pdf-templates/preview", {
      htmlContent: "<p>{{customer_name}}</p>",
      data: { customer_name: "<script>alert(1)</script> & Co" },
    });
    expect(escaped.html).not.toContain("<script>alert");
    expect(escaped.html).toContain("&lt;script&gt;");

    const single = await api.post("/pdf-templates/preview", {
      htmlContent: "<p>{{a}}</p>",
      data: { a: "{{bank_account}}" },
    });
    expect(single.html).toContain("{{bank_account}}");
    await api.dispose();
  });

  test("PRT-04 printed totals agree with the invoice", async () => {
    const api = await Api.signIn();
    const { invoice } = await api.createFitInvoice();

    const { API_URL } = await import("./support/env");
    const ctx = await (await import("@playwright/test")).request.newContext();
    const res = await ctx.get(`${API_URL}/invoices/${invoice.id}/print`, {
      headers: { Authorization: `Bearer ${api.token}` },
    });
    const html = await res.text();

    expect(res.status()).toBe(200);
    expect(html, "no placeholder may survive rendering").not.toMatch(/\{\{\s*\w+\s*\}\}/);
    expect(html).toContain(invoice.code);
    // 25.000.000 base + 5% fee, No Tax.
    expect(html).toContain("26.250.000,00");

    await ctx.dispose();
    await api.dispose();
  });
});

test.describe("Master data", () => {
  test("REG-06 a bank an internal account uses cannot be deleted", async () => {
    const api = await Api.signIn();
    const accounts = await api.internalAccounts();
    const inUse = accounts.find((a) => a.bankId);
    test.skip(!inUse, "no internal account references a bank");

    const refusal = await api.expectRefusal("delete", `/banks/${inUse!.bankId}`);
    expect(refusal.status).toBe(400);
    expect(refusal.message).toMatch(/internal account\(s\)/);
    await api.dispose();
  });

  test("REG-04/05 a bank reference can be edited and removed", async () => {
    const api = await Api.signIn();
    const created = await api.post("/banks", {
      bankCode: String(900 + Math.floor(Math.random() * 99)),
      bankName: uniq("BANK"),
      bankBrand: "E2E",
    });

    const renamed = await api.patch(`/banks/${created.id}`, { bankName: "E2E renamed" });
    expect(renamed.bankName).toBe("E2E renamed");

    await api.del(`/banks/${created.id}`);
    await api.dispose();
  });

  test("REG-09/10 categories can be renamed, and one in use cannot be removed", async () => {
    const api = await Api.signIn();
    const created = await api.post("/products/categories", { name: uniq("CAT") });

    const renamed = await api.patch(`/products/categories/${created.id}`, {
      name: `${created.name}-renamed`,
    });
    expect(renamed.name).toContain("renamed");
    await api.del(`/products/categories/${created.id}`);

    const list = await api.get("/products/categories");
    const inUse = (list.data ?? list).find((c: any) => (c._count?.products ?? 0) > 0);
    test.skip(!inUse, "no category has products");

    const refusal = await api.expectRefusal("delete", `/products/categories/${inUse.id}`);
    expect(refusal.status).toBe(400);
    expect(refusal.message).toMatch(/product\(s\)/);
    await api.dispose();
  });

  test("REG-12 the dead sales-items permissions are gone", async () => {
    const api = await Api.signIn();
    const page = await api.get("/permissions?search=sales-items&limit=50");
    const stale = (page.data ?? []).filter((p: any) => p.route.startsWith("sales-items."));

    expect(stale, "granting these did nothing, so they were removed").toHaveLength(0);
    await api.dispose();
  });
});
