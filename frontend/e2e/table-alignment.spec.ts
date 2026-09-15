import { test, expect, type Locator, type Page } from "@playwright/test";
import { openPage } from "./support/ui";

/**
 * ALIGN — every row of a finance table covers as many columns as its header.
 *
 * These tables mix two kinds of column. The bank columns are a loop over the
 * accounts the year actually used, so header, body and totals cannot disagree
 * about those: one array drives all four. Everything around them - the
 * description, the outstanding balance, the actions - is still written out by
 * hand, once per row kind, with nothing tying the four copies together.
 *
 * That is where it goes wrong, and it goes wrong silently. Account Payable
 * shipped a header for "AP In and Out" with no cell beneath it and two totals
 * cells commented out, so every figure in Subtotal and Period Totals sat two
 * columns left of the heading it belonged to. Nothing threw. The page looked
 * fine. Only adding the numbers up by eye would have caught it.
 *
 * Counting is cheap and exact, so the suite does it instead.
 */

/** Columns a row covers, counting a colspan as the many it stands for. */
async function columnsCovered(row: Locator): Promise<number> {
  const spans = await row.locator("th, td").evaluateAll((cells) =>
    cells.map((cell) => Number(cell.getAttribute("colspan") ?? 1)),
  );
  return spans.reduce((total, span) => total + span, 0);
}

/** The table carrying the account columns, which is the widest one on the page. */
async function widestTable(page: Page): Promise<Locator> {
  const tables = page.locator("table");
  await expect(tables.first()).toBeVisible();

  const counts = await tables.evaluateAll((els) =>
    els.map((el) => el.querySelectorAll("thead th").length),
  );
  const widest = counts.indexOf(Math.max(...counts));
  return tables.nth(widest);
}

const PAGES = [
  { name: "Sales", path: "/sales", heading: /sales/i },
  { name: "Account Receivable", path: "/account-receivable", heading: /receivable/i },
  { name: "Account Payable", path: "/account-payable", heading: /payable/i },
  { name: "Inter Account", path: "/inter-account", heading: /inter.?account/i },
];

const YEARS = ["2025", "2026"];

for (const target of PAGES) {
  test.describe(`ALIGN — ${target.name}`, () => {
    for (const year of YEARS) {
      test(`every row covers the header's columns in ${year}`, async ({ page }) => {
        await openPage(page, target.path, target.heading);

        // The year filter is a combobox; the tables differ in how they label it,
        // so it is found by the option it has to offer rather than by a name.
        const yearPicker = page.getByRole("combobox").filter({ hasText: /20\d\d|all/i }).first();
        if (await yearPicker.count()) {
          await yearPicker.click();
          const option = page.getByRole("option", { name: year, exact: true });
          if (await option.count()) await option.click();
          else await page.keyboard.press("Escape");
        }

        const table = await widestTable(page);
        const header = table.locator("thead tr").last();
        const expected = await columnsCovered(header);
        expect(expected, "header should have columns").toBeGreaterThan(3);

        const rows = table.locator("tbody tr");
        const count = await rows.count();
        expect(count, "table should have rows").toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
          const row = rows.nth(i);
          // A placeholder row ("No records found") deliberately spans the table
          // and says so with one cell; it has nothing to line up with.
          const cells = await row.locator("td").count();
          if (cells <= 1) continue;

          const covered = await columnsCovered(row);
          const label = (await row.locator("td").first().innerText()).trim().slice(0, 40);
          expect(
            covered,
            `${target.name} ${year}: row ${i + 1} ("${label}") covers ${covered} of ${expected} columns`,
          ).toBe(expected);
        }
      });
    }
  });
}
