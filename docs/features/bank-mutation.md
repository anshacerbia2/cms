# Bank Mutation System

The Bank Mutation system is an enterprise-grade financial ledger designed for high data integrity, strict auditability, and optimized performance. It manages transaction records for various institutional accounts and maintains cascading balances across fiscal years.

## Core Principles

### 1. Zero-Variance Continuity
The closing balance of fiscal year $N$ is the immutable opening balance of fiscal year $N+1$. The system ensures this link is never broken, even when historical data is corrected.

### 2. UTC 00:00:00 Enforcement
To avoid timezone-related balance shifts (e.g., a transaction recorded at 23:30 WIB appearing in the previous day in UTC), all transaction dates and fiscal boundaries are normalized to `00:00:00.000Z`.

### 3. "Lazy Cascading" Synchronization
Instead of recalculating decades of data on every single transaction entry, the system uses a lazy propagation strategy:
- **Ongoing Years**: Normal entry triggers a local recalculation for the current year only.
- **Future Years**: If the current year's closing changes, the immediate next year is marked as `isStale: true`.
- **User Prompt**: When a user views a stale year, they are prompted with a **"Sync Required"** alert to trigger a manual recalculation, which then propagates the stale flag to the next year.
- **Historical Correction**: If a `CLOSED` year is modified, the system automatically marks all subsequent years as stale.

## Architecture

### Backend (`BankMutationService`)
- **`recalculateLedger(accountId, year)`**: The core engine. It iterates through transactions, calculates running balances (`colE`), and updates the next year's `openingBalance`. It recurses automatically ONLY if correcting historical (`CLOSED`) data.
- **`createBulkTransactions`**: Handles Excel imports and manual bulk entries. It enforces UTC dates and triggers the initial recalculation.
- **`isStale` flag**: A boolean in `FiscalPeriod` that tracks whether a year's opening balance is out of sync with its predecessor.

### Frontend (`BankMutationPage`)
- **Visual Hierarchy**: Uses premium aesthetics with status badges (`CLOSED` vs `OPEN`).
- **Sync Alert**: A red-pulsing "Sync Required" button appears when `isStale` is true, even if the year is closed.
- **UTC Safety**: Normalizes all user-entered dates to UTC midnights before sending to the API.

## Workflow: Correcting a Closed Year
1. User enters a transaction in 2024 (which is `CLOSED`).
2. Backend accepts the entry (no longer blocked).
3. Backend marks 2024 and all future years (2025, 2026...) as `isStale: true`.
4. Backend triggers a recursive sync starting from 2024.
5. As each year finishes, its `isStale` flag is cleared.
6. If the process is interrupted, the remaining years keep their `isStale` flag, prompting the user to click "Sync" later.

## Database Schema
- **`InternalAccount`**: Stores bank/cash account metadata.
- **`FinancialTransaction`**: The raw ledger entries. `colE` stores the calculated running balance.
- **`FiscalPeriod`**: Stores snapshots per year (`openingBalance`, `closingBalance`, `status`, `isStale`).
