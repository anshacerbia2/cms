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
    // The totals row is the table's own <tfoot>, rendered only when the filtered
    // detail is non-empty. Addressing the element beats matching its text.
    const total = () => modal.locator("tfoot tr").first();
    const noRecords = () => modal.getByText(/no records found/i);
    const yearSelect = page.getByRole("combobox").filter({ hasText: /^20\d{2}$/ }).first();

    // Prove this is the P&L table before looking for anything in it. These row
    // labels are hardcoded in the component's own `expenseLedgers`, so if one
    // changes the test should say which rather than quietly find nothing.
    const rowLabels = await page.getByRole("cell").allTextContents();
    expect(
      rowLabels.map((label) => label.trim()),
      "the P&L table did not render the ledger rows this test drills into",
    ).toContain(DRILLABLE[0]);

    // The report opens on the current year while the finance seeders load an
    // earlier one, so on a fresh database every line reads zero with no detail
    // behind it — which is what made this test skip instead of run. Walk the
    // years the selector offers rather than pinning one.
    await yearSelect.click();
    const options = page.getByRole("option");
    // Radix mounts the list asynchronously: reading it straight after the click
    // returns an empty array, and an empty array made the loop below a no-op.
    await expect(options.first()).toBeVisible();
    const years = await options.allTextContents();
    await page.keyboard.press("Escape");
    expect(years.length, "the report's year selector offered nothing").toBeGreaterThan(0);

    const cellFor = (account: string) =>
      page
        .getByRole("cell")
        .filter({ hasText: new RegExp(`^\\s*${account}\\s*$`) })
        .first();

    // Take the first drillable ledger any year actually has detail for, keeping
    // a trail so a dead end says what it saw instead of going quiet.
    const tried: string[] = [];
    let opened = "";
    for (const year of years) {
      await yearSelect.click();
      await page.getByRole("option", { name: year, exact: true }).click();

      // Changing the year refetches the statement, and the rows leave the DOM
      // while it loads. An immediate count() reads 0 and reports the row as
      // absent — which is exactly how the year that HAS the data got skipped
      // while the empty one appeared to work, its rows still being cached.
      await expect(
        cellFor(DRILLABLE[0]),
        `the P&L table never came back after switching to ${year}`,
      ).toBeVisible();

      for (const account of DRILLABLE) {
        const cell = cellFor(account);
        if (!(await cell.count())) {
          tried.push(`${year} ${account}: no such row`);
          continue;
        }

        await cell.click();
        if (!(await modal.isVisible({ timeout: 4000 }).catch(() => false))) {
          tried.push(`${year} ${account}: modal never opened`);
          continue;
        }

        // The modal fetches its own detail. Settle on whichever arrives: the
        // totals row, or the empty state that stands in for it.
        await Promise.race([
          total().waitFor({ state: "visible", timeout: 8000 }).catch(() => {}),
          noRecords().waitFor({ state: "visible", timeout: 8000 }).catch(() => {}),
        ]);

        if (await total().count()) {
          opened = `${account} (${year})`;
          break;
        }

        tried.push(
          `${year} ${account}: ${
            (await noRecords().count())
              ? "No Records Found — this database holds no detail for it"
              : `${await modal.getByRole("row").count()} row(s) but no tfoot`
          }`,
        );
        await page.keyboard.press("Escape");
        await expect(modal).toBeHidden();
      }
      if (opened) break;
    }
    // Deliberately not test.skip: the list reporter prints a skip as a bare
    // dash and swallows its reason, which hid two separate faults in this test.
    expect(
      opened,
      `No P&L ledger opened a detail modal with a TOTAL row. Tried:\n  ${tried.join("\n  ")}`,
    ).not.toBe("");

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
    // Same trap as the year list: this dropdown mounts asynchronously, so
    // counting straight after the click reads 0 and skips the whole assertion.
    await expect(boxes.first()).toBeVisible();
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

    // REG-02 — and it goes back. Clear is inside the same dropdown, so reopen it.
    await modal
      .locator("thead th")
      .filter({ hasText: /^Description$/ })
      .locator("button")
      .first()
      .click();
    await expect(page.getByRole("checkbox").first()).toBeVisible();
    await page.getByRole("button", { name: /^Clear$/ }).click();

    await expect.poll(async () => modal.getByRole("row").count()).toBe(rowsBefore);
    expect(parseIdr((await total().textContent()) ?? "")).toBe(unfiltered);
  });
});

test.describe("REG-18 — Balance Sheet detail totals follow the filter", () => {
  /**
   * The same defect REG-01 covers, in the other report. The footer showed the
   * figure the clicked row carried, captured when the modal opened, so filtering
   * the rows never moved it.
   *
   * Cash and Bank are excluded deliberately, not overlooked: their footer is the
   * account's closing balance — the running balance on the last transaction —
   * and summing running balances across a filtered subset means nothing. The fix
   * leaves that branch alone, so a test that filtered it would be asserting the
   * wrong behaviour.
   */
  /**
   * Account rows carry the Tailwind marker class `group/item`, and only the
   * clickable ones also carry `cursor-pointer` — a row whose name contains
   * "depreciation" has no handler. The groups arrive already expanded, seeded
   * from the backend's `isOpen` flag, so clicking a heading *collapses* it and
   * hides exactly the rows this test needs.
   */
  const ITEM = 'div[class*="group/item"][class*="cursor-pointer"]';

  test("the Total row sums only the visible rows", async ({ page }) => {
    // The component prints [BS-DIAG] with what the footer is summing. Surface it
    // here so one terminal run carries both the failure and its evidence.
    page.on("console", async (message) => {
      if (!message.text().includes("BS-DIAG")) return;
      for (const arg of message.args()) {
        try {
          const value = await arg.jsonValue();
          if (typeof value === "object") console.log("[BS-DIAG]", JSON.stringify(value));
        } catch {}
      }
    });

    await openPage(page, "/finance-reports", /^financial reports$/i);
    await page.getByRole("tab", { name: /^balance$/i }).click();

    const modal = dialog(page);
    const total = () => modal.locator("tfoot tr").first();
    const yearSelect = page.getByRole("combobox").filter({ hasText: /^20\d{2}$/ }).first();

    await yearSelect.click();
    const options = page.getByRole("option");
    await expect(options.first()).toBeVisible();
    const years = await options.allTextContents();
    await page.keyboard.press("Escape");
    expect(years.length, "the report's year selector offered nothing").toBeGreaterThan(0);

    const tried: string[] = [];
    let opened = "";

    for (const year of years) {
      await yearSelect.click();
      await page.getByRole("option", { name: year, exact: true }).click();

      const items = page.locator(ITEM);
      await expect(
        items.first(),
        `no clickable balance sheet account rendered for ${year}`,
      ).toBeVisible();

      const count = await items.count();
      for (let i = 0; i < count; i++) {
        const row = items.nth(i);
        const label = ((await row.textContent()) ?? "").trim().slice(0, 40);

        await row.click();
        if (!(await modal.isVisible({ timeout: 4000 }).catch(() => false))) {
          tried.push(`${year} "${label}": nothing opened`);
          continue;
        }

        // Cash and Bank show a closing balance, not a sum, and are excluded from
        // the fix on purpose — filtering one would assert the wrong behaviour.
        const shape = (await modal.getByText(/Financial Audit Trail/i).first().textContent()) ?? "";
        if (/Bank Statement Records/i.test(shape)) {
          tried.push(`${year} "${label}": cash or bank, skipped by design`);
          await page.keyboard.press("Escape");
          await expect(modal).toBeHidden();
          continue;
        }

        await Promise.race([
          total().waitFor({ state: "visible", timeout: 8000 }).catch(() => {}),
          modal.getByText(/no transactions found/i).waitFor({ state: "visible", timeout: 8000 }).catch(() => {}),
        ]);

        if (await total().count()) {
          opened = `${label} (${year})`;
          break;
        }

        tried.push(`${year} "${label}": modal held no rows`);
        await page.keyboard.press("Escape");
        await expect(modal).toBeHidden();
      }
      if (opened) break;
    }

    expect(
      opened,
      `No balance sheet account opened a detail modal with a Total row. Tried:\n  ${tried.join("\n  ")}`,
    ).not.toBe("");

    /**
     * The invariant, asserted rather than "the number moved": the footer must
     * equal the sum of the rows on screen. Every shape puts the amount in the
     * last cell of the row, so this holds whichever category was opened.
     *
     * Checking it before the filter matters too: it proves the comparison itself
     * is sound — right cell, right parser — so a failure afterwards is the
     * total's fault and not the test's.
     */
    const visibleSum = async () => {
      const cells = await modal.locator("tbody tr td:last-child").allTextContents();
      return cells.reduce((sum, text) => sum + (parseIdr(text) || 0), 0);
    };
    const footer = async () => parseIdr((await total().textContent()) ?? "");
    const agrees = async (when: string) => {
      const [f, v] = [await footer(), await visibleSum()];
      expect(Math.abs(f - v), `${when}: footer ${f} vs rows ${v}`).toBeLessThan(1);
    };

    await agrees("unfiltered");
    const rowsBefore = await modal.locator("tbody tr").count();
    expect(rowsBefore, "nothing to filter").toBeGreaterThan(1);

    /**
     * Which column can be partially filtered depends on the data, not on the
     * shape: unticking a value in a column that holds one distinct value empties
     * the table, and an empty table has no total to check. So try each column
     * and keep the first that leaves rows behind, clearing up after the ones
     * that do not.
     */
    const columns = modal.locator("thead th").filter({ has: page.locator("button") });
    const columnCount = await columns.count();
    const attempts: string[] = [];
    let filtered = 0;

    for (let i = 0; i < columnCount; i++) {
      const header = columns.nth(i);
      const name = ((await header.textContent()) ?? `column ${i}`).trim();

      await header.locator("button").first().click();
      const boxes = page.getByRole("checkbox");
      await expect(boxes.first()).toBeVisible();

      if ((await boxes.count()) - 1 < 2) {
        attempts.push(`${name}: only one value to choose from`);
        await page.getByRole("button", { name: /^Cancel$/ }).click();
        continue;
      }

      await boxes.last().uncheck();
      // Escape only closes the dropdown; handleApply runs on OK and nowhere else.
      await page.getByRole("button", { name: /^OK$/ }).click();

      await expect.poll(async () => modal.locator("tbody tr").count()).toBeLessThan(rowsBefore);
      filtered = await modal.locator("tbody tr").count();
      if (filtered > 0) {
        attempts.push(`${name}: ${rowsBefore} -> ${filtered} rows`);
        break;
      }

      // Emptied it. Put the column back and move on.
      attempts.push(`${name}: emptied the table`);
      await header.locator("button").first().click();
      await expect(page.getByRole("checkbox").first()).toBeVisible();
      await page.getByRole("button", { name: /^Clear$/ }).click();
      await expect.poll(async () => modal.locator("tbody tr").count()).toBe(rowsBefore);
    }

    expect(
      filtered,
      `no column could be filtered without emptying the table:\n  ${attempts.join("\n  ")}`,
    ).toBeGreaterThan(0);

    await expect(total()).toBeVisible();
    await agrees(`after filtering (${attempts[attempts.length - 1]})`);
  });
});

test.describe("REG-17 — the sidebar keeps the menu tree to itself", () => {
  test("signing in logs nothing to the console", async ({ page }) => {
    const noise: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "log") noise.push(message.text());
    });

    await openPage(page, "/dashboard", /dashboard|welcome/i);
    // Every render printed the signed-in user's whole menu tree, which is both
    // noise and a needless disclosure in anyone's devtools.
    expect(noise.filter((line) => /menu/i.test(line)), noise.join("\n")).toHaveLength(0);
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
