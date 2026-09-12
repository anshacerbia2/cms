# End-to-end suite

Playwright, driving the real UI against a real API and database.

## What it needs running

The config does **not** start anything — the API needs its own database and seed,
so bringing the stack up is a deliberate step.

```bash
# 1. database, from empty
createdb cms_local
cd backend
npx prisma generate
npx prisma migrate deploy
npx prisma db seed          # roles, permissions, menus, sample master data

# 2. api on :3001
pnpm start:dev

# 3. ui on :5174, in another shell
cd ../frontend
pnpm dev
```

Never point this at production. The suite creates and deletes projects,
proposals, invoices, vouchers, roles and templates, and it toggles the non-VAT
settlement flag on a real internal account.

## Running it

```bash
cd frontend
pnpm install
npx playwright install chromium     # once, downloads the browser

pnpm e2e                # everything
pnpm e2e:ui             # pick and watch tests interactively
pnpm e2e --grep VAL     # just the validation scenarios
pnpm e2e --project=viewer
```

Override the defaults with `E2E_BASE_URL`, `E2E_API_URL`,
`E2E_ADMIN_PASSWORD` and `E2E_VIEWER_PASSWORD`.

### When the browser download will not fit

Playwright pins a Chromium build to its library version, so upgrading the
library asks for a matching download. The error names the build it wants:

```
Executable doesn't exist at ...\chromium_headless_shell-1243\...
```

Two ways out. Fetch it, which needs a few hundred megabytes free:

```bash
pnpm exec playwright install chromium
```

Or drive the Chrome already on the machine and download nothing:

```bash
set E2E_USE_SYSTEM_CHROME=1 && pnpm e2e     # Windows
E2E_USE_SYSTEM_CHROME=1 pnpm e2e            # macOS, Linux
```

The pinned Chromium is the better default — system Chrome updates underneath you
and can change a result with no commit behind it — so treat the flag as a way
through a blocked machine rather than the normal way to run.

## How it is laid out

| File | Covers |
| --- | --- |
| `auth.setup.ts` | Signs in once per role, saves the session to `.auth/` |
| `flows.spec.ts` | The two project paths, walked in the browser end to end |
| `validation.spec.ts` | Required fields and format rules, per form |
| `guards.spec.ts` | Every rule that passes by refusing, asserted on its message |
| `regressions.spec.ts` | The repairs, including the two purely visual ones |
| `viewer.spec.ts` | What a read-only role is not offered |
| `support/api.ts` | API client and the factories that build preconditions |
| `support/ui.ts` | Row, menu, dialog and toast helpers |

## Two things to know before adding tests

**There are no test ids.** The app ships zero `data-testid` attributes, so every
selector comes from visible text or an ARIA role. That is fine for headings and
primary buttons, and fragile for row menus, where each row renders an identical
unlabelled trigger. Always reach a row through its document code first —
`support/ui.ts` has `row()`, `openRowMenu()` and `rowAction()` for exactly this.
Adding `data-testid` to the row trigger, the row keyed by code, and the dialog
submit buttons would make this suite considerably less brittle.

**Preconditions go through the API.** Driving the UI to build a WIN proposal
before every invoice test makes each test a dozen steps long and fail for
reasons unrelated to what it checks. `support/api.ts` has `wonProposal()`,
`createFitInvoice()`, `createProposalInvoice()` and friends. The one deliberate
exception is `flows.spec.ts`, whose whole point is that a person can complete
the journey in the browser.

## Housekeeping

Records are tagged `E2E-` and most specs clean up after themselves, but a failed
run leaves debris behind on purpose so it can be inspected. To clear it:

```sql
DELETE FROM projects WHERE name LIKE 'E2E-%';
DELETE FROM roles WHERE slug LIKE 'e2e-%';
DELETE FROM users WHERE email LIKE '%@local.test';
DELETE FROM pdf_templates WHERE name LIKE 'E2E-%';
```

`guards.spec.ts` turns the non-VAT settlement flag back off in a `finally`, but
if a run is killed mid-test, check it:

```sql
UPDATE internal_accounts SET is_non_vat_settlement = false;
```

## Known gaps

- The printed-document scenarios assert the rendered HTML through the API rather
  than opening the tab, because `window.print()` blocks on a native dialog. A UI
  version needs `context.waitForEvent('page')` and a stubbed `window.print`.
- `REG-01` depends on the seeded P&L having a line with detail rows; it skips
  itself when the dataset has none.
- Amounts render Indonesian (`52.000.000,00`). The config pins `id-ID` so a
  runner in another region does not fail on separators.
