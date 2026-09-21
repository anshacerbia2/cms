/**
 * Master Ledger dan Sub Ledger 1 untuk Bank Statement - satu-satunya sumber daftarnya.
 *
 * Disusun dari seluruh `financial_transactions` produksi (semua bank, Cash, Non CB,
 * 2025 dan 2026) pada 2026-09-21: ejaan kembar disatukan, nama yang dipakai adalah
 * ejaan yang paling sering muncul. Ejaan lama yang disatukan ada di
 * `LEDGER_ALIASES` / `SUB_LEDGER_ALIASES` (`src/finance/common/ledger-refs.ts`).
 *
 * `code` dipakai laporan keuangan untuk menyaring - jangan diubah. Nama boleh
 * diganti di halaman Finance > Ledgers; seeder tidak menimpa nama yang sudah ada.
 */
export type LedgerSpec = { code: string; name: string; subLedgers: { name: string; code?: string }[] };

export const LEDGER_MASTER: LedgerSpec[] = [
  {
    code: 'ACCOUNT_PAYABLE',
    name: 'Account Payable',
    subLedgers: [
      { name: 'AP Credit Card' },
      { name: 'AP Deposit from customer' },
      { name: 'AP Deposit to customer' },
      { name: 'AP Expense' },
      { name: 'AP Others' },
      { name: 'AP Tax' },
      { name: 'AP Temporary Loan' },
      { name: 'AP Trade' },
    ],
  },
  {
    code: 'ACCOUNT_RECEIVABLE',
    name: 'Account Receivable',
    subLedgers: [
      { name: 'AR Cash Advance' },
      { name: 'AR Deposit to vendor' },
      { name: 'AR Others' },
      { name: 'AR Prepaid Tax' },
      { name: 'AR Refund' },
      { name: 'AR Staff Loan' },
      { name: 'AR Temporary Notes' },
      { name: 'AR Time Deposit' },
      { name: 'AR Trade' },
    ],
  },
  {
    code: 'AYAT_SILANG',
    name: 'Ayat Silang',
    subLedgers: [
      { name: 'Ayat Silang' },
    ],
  },
  {
    code: 'COGS',
    name: 'Cost of Goods',
    subLedgers: [
      { name: 'COGS' },
    ],
  },
  {
    code: 'EQUITY',
    name: 'Equity',
    subLedgers: [
      { name: 'Retained Earnings' },
    ],
  },
  {
    code: 'EXPENDITURE',
    name: 'Expenditure',
    subLedgers: [
      { name: 'Fixed Asset' },
    ],
  },
  {
    code: 'FINANCIAL_EXPENSE',
    name: 'Financial Expense',
    subLedgers: [
      { name: 'Bank Charge' },
      { name: 'Interest Loan' },
    ],
  },
  {
    code: 'INCOME_TAX',
    name: 'Income Tax',
    subLedgers: [
      { name: 'Income Tax' },
    ],
  },
  {
    code: 'INTER_ACCOUNTS',
    name: 'Inter Accounts',
    subLedgers: [
      { name: 'Bank Raya to BCA Juanda' },
      { name: 'BCA Juanda to AP In and Out' },
      { name: 'BCA Juanda to BCA Sahardjo' },
      { name: 'BCA Juanda to BRI Sahardjo' },
      { name: 'BCA Juanda to Cash IDR' },
      { name: 'BCA Juanda to Mandiri Mid Plaza' },
      { name: 'BCA Juanda to Non Cash Bank' },
      { name: 'BCA Juanda to PPn In and Out' },
      { name: 'BCA Sahardjo to BCA Juanda' },
      { name: 'BCA Sahardjo to BTN' },
      { name: 'BCA Sahardjo to Mandiri Mid Plaza' },
      { name: 'BCA Sahardjo to Non Cash Bank' },
      { name: 'BNI to BCA Juanda' },
      { name: 'BNI to Mandiri Mid Plaza' },
      { name: 'BRI Sahardjo to BCA Juanda' },
      { name: 'BRI Sahardjo to BCA Sahardjo' },
      { name: 'BRI Sahardjo to Mandiri Mid Plaza' },
      { name: 'BRI Sahardjo to Non Cash Bank' },
      { name: 'BRI Tebet to BCA Sahardjo' },
      { name: 'BTN to BCA Juanda' },
      { name: 'BTN to BCA Sahardjo' },
      { name: 'BTN to BRI Sahardjo' },
      { name: 'BTN to Mandiri Mid Plaza' },
      { name: 'Cash IDR to BCA Juanda' },
      { name: 'Cash IDR to BCA Sahardjo' },
      { name: 'Cash IDR to Non Cash Bank' },
      { name: 'Mandiri Mid Plaza to BCA Juanda' },
      { name: 'Mandiri Mid Plaza to BCA Sahardjo' },
      { name: 'Mandiri Mid Plaza to BRI Sahardjo' },
      { name: 'Mandiri Mid Plaza to BRI Tebet' },
      { name: 'Mandiri Mid Plaza to BTN' },
      { name: 'Mandiri Mid Plaza to Mandiri Plasa Mandiri' },
      { name: 'Mandiri Mid Plaza to Non Cash Bank' },
      { name: 'Mandiri Mid Plaza to PPn In and Out' },
      { name: 'Mandiri Plasa Mandiri to BCA Juanda' },
      { name: 'Mandiri Plasa Mandiri to BRI Sahardjo' },
      { name: 'Mandiri Plasa Mandiri to Mandiri Mid Plaza' },
      { name: 'Mandiri Plasa Mandiri to Non Cash Bank' },
      { name: 'Non Cash Bank to BCA Juanda' },
      { name: 'Non Cash Bank to BCA Sahardjo' },
      { name: 'Non Cash Bank to BRI Sahardjo' },
      { name: 'Non Cash Bank to Mandiri Mid Plaza' },
      { name: 'Non Cash Bank to PPn In and Out' },
      { name: 'PPn In and Out to Non Cash Bank' },
    ],
  },
  {
    code: 'MARKETING_EXPENSE',
    name: 'Marketing Expense',
    subLedgers: [
      { name: 'Entertainment' },
      { name: 'Notarial Fee' },
      { name: 'Research,Training and Product Development' },
      { name: 'Sales and Promotion' },
    ],
  },
  {
    code: 'OFFICE_EXPENSE',
    name: 'Office Expense',
    subLedgers: [
      { name: 'Building Management' },
      { name: 'Car Insurance' },
      { name: 'Computer Supplies' },
      { name: 'Donation' },
      { name: 'Groceries and Household Misc' },
      { name: 'Internet and emails' },
      { name: 'License' },
      { name: 'Maintenance' },
      { name: 'Office Rent' },
      { name: 'Photocopy' },
      { name: 'Post and stamps' },
      { name: 'Stationary' },
      { name: 'Subscription' },
      { name: 'Telephone' },
      { name: 'Transportation' },
    ],
  },
  {
    code: 'OTHER_INCOME_EXPENSE',
    name: 'Other Income/Expense',
    subLedgers: [
      { name: 'Forex Gain (Loss)' },
      { name: 'Interest Income' },
      { name: 'Other Expense' },
      { name: 'Other Income' },
    ],
  },
  {
    code: 'PERSONNEL_EXPENSE',
    name: 'Personnel Expense',
    subLedgers: [
      { name: 'BPJS Kesehatan' },
      { name: 'BPJS Tenaga Kerja' },
      { name: 'Honorarium' },
      { name: 'HR Development' },
      { name: 'Incentive and Bonus' },
      { name: 'Meals Allowance' },
      { name: 'Medical Allowance' },
      { name: 'Overtime' },
      { name: 'Salary and THR' },
    ],
  },
  {
    code: 'RETAINED_EARNINGS',
    name: 'Retained Earnings',
    subLedgers: [
      { name: 'Dividend', code: 'DIVIDEND' },
    ],
  },
  {
    code: 'SALES',
    name: 'Sales',
    subLedgers: [
      { name: 'Sales Invoice' },
    ],
  },
];
