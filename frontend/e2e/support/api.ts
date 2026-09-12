import { request, type APIRequestContext } from "@playwright/test";
import { ACCOUNTS, API_URL, uniq, type RoleName } from "./env";

/**
 * Thin client over the API, used to build the state a UI test needs.
 *
 * Driving the UI to create a WIN proposal before every invoice test would make
 * each test a dozen steps long and fail for reasons unrelated to what it checks.
 * The rule is: build preconditions here, assert in the browser.
 */
export class Api {
  private constructor(
    private readonly ctx: APIRequestContext,
    readonly token: string,
  ) {}

  /**
   * Refuses to run against anything but a local API.
   *
   * This suite creates and deletes projects, invoices, vouchers and roles, and
   * toggles a settlement flag on a real account. A mistyped E2E_API_URL is all
   * that stands between it and someone's live data, so the default is to stop.
   * E2E_ALLOW_REMOTE_API=1 for a deliberate staging run.
   */
  private static assertLocal() {
    const host = new URL(API_URL).hostname;
    const local = ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(host);

    if (!local && !process.env.E2E_ALLOW_REMOTE_API) {
      throw new Error(
        `Refusing to run against ${host}: this suite writes and deletes records. ` +
          `Point E2E_API_URL at a local stack, or set E2E_ALLOW_REMOTE_API=1 if you ` +
          `are certain the target is disposable.`,
      );
    }
  }

  static async signIn(role: RoleName = "admin") {
    Api.assertLocal();
    // No baseURL on purpose. Playwright resolves a relative path with URL
    // semantics, so a leading slash replaces the whole path of the base —
    // "/auth/login" against "http://host/api" resolves to "http://host/auth/login"
    // and the /api prefix silently disappears. Every request here is absolute.
    const ctx = await request.newContext();
    const res = await ctx.post(`${API_URL}/auth/login`, { data: ACCOUNTS[role] });

    if (!res.ok()) {
      throw new Error(
        `Sign-in failed for ${ACCOUNTS[role].email} (${res.status()}). ` +
          `Seed the database and check E2E_${role.toUpperCase()}_PASSWORD.`,
      );
    }

    const body = await res.json();
    return new Api(ctx, body.data.access_token);
  }

  async dispose() {
    await this.ctx.dispose();
  }

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  /** Unwraps the API's `{ statusCode, data }` envelope and throws on failure. */
  private async send(method: "get" | "post" | "patch" | "delete", path: string, data?: unknown) {
    const res = await this.ctx[method](`${API_URL}${path}`, {
      headers: this.headers,
      data: data as any,
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : {};

    if (!res.ok()) {
      const message = Array.isArray(body?.message) ? body.message.join("; ") : body?.message;
      throw new Error(`${method.toUpperCase()} ${path} -> ${res.status()}: ${message ?? text}`);
    }
    return body.data ?? body;
  }

  get = (path: string) => this.send("get", path);
  post = (path: string, data: unknown) => this.send("post", path, data);
  patch = (path: string, data: unknown) => this.send("patch", path, data);
  del = (path: string) => this.send("delete", path);

  /**
   * Same call without the throw, for the scenarios whose whole point is the
   * refusal. Returns the status and the message the UI would surface.
   */
  async expectRefusal(method: "post" | "patch" | "delete", path: string, data?: unknown) {
    const res = await this.ctx[method](`${API_URL}${path}`, {
      headers: this.headers,
      data: data as any,
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : {};
    const message = Array.isArray(body?.message) ? body.message.join("; ") : (body?.message ?? "");
    return { status: res.status(), message: String(message) };
  }

  // ---------------------------------------------------------------- factories

  async firstCustomerId() {
    const page = await this.get("/customers?limit=1");
    const id = page.data?.[0]?.id;
    if (!id) throw new Error("No customers seeded — run `npx prisma db seed`.");
    return Number(id);
  }

  async firstProductId() {
    const page = await this.get("/products?limit=1");
    const id = page.data?.[0]?.id;
    if (!id) throw new Error("No products seeded — run `npx prisma db seed`.");
    return Number(id);
  }

  /**
   * A product of this test's own, for the scenarios that change a price.
   *
   * Patching a price rotates the version — the active row is retired and a new
   * one created — so there is no way to put a seeded product back as it was.
   * Creating a throwaway keeps that history out of shared data entirely.
   */
  async createProduct(price = 5_000_000) {
    return this.post("/products", { name: uniq("PROD"), unit: "unit", price });
  }

  /** An internal account, optionally one flagged as the non-VAT settlement account. */
  async internalAccounts() {
    const page = await this.get("/banks/internal-accounts?limit=50");
    return (page.data ?? page) as any[];
  }

  async createProject(overrides: Record<string, unknown> = {}) {
    const customerId = overrides.customerId ?? (await this.firstCustomerId());
    return this.post("/projects", {
      name: uniq("PRJ"),
      refDocNo: uniq("REF"),
      value: 100_000_000,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      dueDate: "2026-11-30",
      type: "REGULAR",
      customerId,
      ...overrides,
    });
  }

  /** A proposal whose items already total `total`, left in DRAFT. */
  async createProposal(projectId: number | string, overrides: Record<string, unknown> = {}) {
    return this.post("/proposals", {
      projectId: Number(projectId),
      pricingModel: "A",
      managementFeeType: "PERCENT",
      managementFee: 4,
      vatRate: 11,
      totalAmountItems: 50_000_000,
      ...overrides,
    });
  }

  /** Project → proposal → items → WIN, the state most invoice tests start from. */
  async wonProposal(totalAmountItems = 50_000_000) {
    const project = await this.createProject();
    const proposal = await this.createProposal(project.id, { totalAmountItems });
    const won = await this.patch(`/proposals/${proposal.id}`, { status: "WIN" });
    return { project, proposal: won };
  }

  async createFitInvoice(overrides: Record<string, unknown> = {}) {
    const project = await this.createProject({ type: "FIT" });
    const invoice = await this.post("/invoices", {
      projectId: Number(project.id),
      customerId: await this.firstCustomerId(),
      invoiceNumber: uniq("INV"),
      dueDate: "2026-10-31",
      billingType: "FULL_AMOUNT",
      taxType: "NO_TAX",
      totalAmount: 25_000_000,
      managementFeeType: "PERCENT",
      managementFee: 5,
      ...overrides,
    });
    return { project, invoice };
  }

  async createProposalInvoice(overrides: Record<string, unknown> = {}) {
    const { project, proposal } = await this.wonProposal();
    const itemIds = (proposal.salesItems ?? []).map((item: any) => Number(item.id));
    const invoice = await this.post("/invoices", {
      proposalId: Number(proposal.id),
      customerId: await this.firstCustomerId(),
      invoiceNumber: uniq("INV"),
      dueDate: "2026-10-31",
      billingType: "FULL_AMOUNT",
      taxType: "TAX_NON_WAPU",
      vatRate: 11,
      itemIds,
      ...overrides,
    });
    return { project, proposal, invoice };
  }

  async createReceiveVoucher(
    allocations: Array<Record<string, unknown>>,
    overrides: Record<string, unknown> = {},
  ) {
    const amount = allocations.reduce((sum, a) => sum + Number(a.amountApplied ?? 0), 0);
    return this.post("/receive-vouchers", {
      rvNumber: uniq("RV"),
      rvDate: "2026-09-12",
      amount,
      paymentForm: "BANK",
      payerType: "CUSTOMER",
      payerNameManual: `${uniq("PAYER")}`,
      invoiceAllocations: allocations,
      ...overrides,
    });
  }

  async createPaymentVoucher(overrides: Record<string, unknown> = {}) {
    return this.post("/payment-vouchers", {
      pvNumber: uniq("PV"),
      issuingDate: "2026-09-12",
      amount: 1_000_000,
      payableType: "SUPPLIER",
      payableNameManual: uniq("VENDOR"),
      category: "OPERATIONAL",
      sourcePaymentForm: "TRANSFER",
      ...overrides,
    });
  }

  async createRole(overrides: Record<string, unknown> = {}) {
    const slug = uniq("role").toLowerCase();
    return this.post("/roles", { name: slug, slug, ...overrides });
  }

  async permissionIdByRoute(route: string) {
    const page = await this.get(`/permissions?search=${encodeURIComponent(route)}`);
    const match = (page.data ?? []).find((p: any) => p.route === route);
    if (!match) throw new Error(`Permission ${route} not found — run the seeders.`);
    return Number(match.id);
  }

  async menuIdByRoute(route: string) {
    const flatten = (nodes: any[]): any[] =>
      nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
    const match = flatten(await this.get("/menus")).find((m: any) => m.permission?.route === route);
    if (!match) throw new Error(`Menu for ${route} not found — run the seeders.`);
    return Number(match.id);
  }

  async activeTemplate(type: "INVOICE" | "PROPOSAL") {
    const page = await this.get(`/pdf-templates?type=${type}&limit=50`);
    return (page.data ?? []).find((t: any) => t.isActive);
  }
}
