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

  static async signIn(role: RoleName = "admin") {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.post("/auth/login", { data: ACCOUNTS[role] });

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
    const res = await this.ctx[method](path, { headers: this.headers, data: data as any });
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
    const res = await this.ctx[method](path, { headers: this.headers, data: data as any });
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
