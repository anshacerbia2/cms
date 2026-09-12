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

# 2. api on :3000
pnpm start:dev

# 3. ui on :5173, in another shell
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

### Which browser it drives

The Chrome already installed on the machine, so there is nothing to download.

Playwright would rather ship its own Chromium pinned to the library version,
which is more reproducible — system Chrome updates underneath you. But that
build is a few hundred megabytes, has to be fetched again on every library bump,
and a machine short on disk cannot run the suite at all. If you want the pinned
one:

```bash
pnpm exec playwright install chromium
E2E_PINNED_CHROMIUM=1 pnpm e2e
```

That is what CI should use, where the download is cheap.

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

## When sign-in fails

`auth.setup.ts` reports what went wrong rather than timing out silently, and the
message names the three causes worth checking. The most common by far:

**The app cannot reach the API.** Copy `.env.example` to `.env` and restart
`pnpm dev` — Vite reads it only at startup, so editing it while the dev server
runs changes nothing.

```
VITE_API_URL=http://127.0.0.1:3000/api
VITE_BACKEND_URL=http://127.0.0.1:3000
```

The address matters more than the port. Without a `.env`, `api.ts` falls back to
the relative `/api` and `vite.config.ts` proxies it to `http://localhost:3000` —
which fails on Windows, because the API binds `127.0.0.1` (IPv4 only, from the
loopback fix) while `localhost` resolves to `::1` first. Nothing is listening
there, the proxy connects to nothing, and the page sits on `/login` with no
visible error. Naming `127.0.0.1` explicitly removes the guess.

The other two: the database has no seeded users (`npx prisma db seed` in
`backend/`), or the password differs from what `auth.seeder.ts` hashes for all
three accounts — `admin123`. Override with `E2E_ADMIN_PASSWORD` and
`E2E_VIEWER_PASSWORD`.

## Known gaps

- The printed-document scenarios assert the rendered HTML through the API rather
  than opening the tab, because `window.print()` blocks on a native dialog. A UI
  version needs `context.waitForEvent('page')` and a stubbed `window.print`.
- `REG-01` depends on the seeded P&L having a line with detail rows; it skips
  itself when the dataset has none.
- Amounts render Indonesian (`52.000.000,00`). The config pins `id-ID` so a
  runner in another region does not fail on separators.
