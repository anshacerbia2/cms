/**
 * Nama modul dan nama kolom untuk activity log, sama dengan yang dipakai di
 * halaman masing-masing. Kolom yang tidak terdaftar tampil dengan nama
 * aslinya - lebih baik terlihat daripada hilang.
 */
export const TABLE_LABELS: Record<string, string> = {
  account_receivables: "Account Receivable",
  account_receivable_amounts: "Account Receivable",
  account_payables: "Account Payable",
  account_payable_amounts: "Account Payable",
  sales_records: "Sales",
  sales_record_amounts: "Sales",
  ppn_in_out: "PPN In/Out",
  inter_account: "Inter Account",
  inter_account_amounts: "Inter Account",
  depreciation: "Depreciation",
  financial_transactions: "Bank Statement",
  fiscal_periods: "Fiscal Period",
  equity_properties: "Equity / P&L Properties",
  ledgers: "Ledger",
  sub_ledgers: "Sub Ledger 1",
  internal_accounts: "Account",
  banks: "Bank",
};

/** Modul yang bisa dipilih di filter halaman Activity Log (tabel rincian ikut otomatis). */
export const FILTERABLE_TABLES = [
  "account_receivables",
  "account_payables",
  "sales_records",
  "ppn_in_out",
  "inter_account",
  "depreciation",
  "financial_transactions",
  "fiscal_periods",
  "equity_properties",
  "ledgers",
  "sub_ledgers",
  "internal_accounts",
  "banks",
];

const COMMON: Record<string, string> = {
  tagYear: "Fiscal Year",
  source: "Origin",
  internal_account_id: "Account",
  amount: "Amount",
};

export const COLUMN_LABELS: Record<string, Record<string, string>> = {
  account_receivables: {
    colA: "Col A", colB: "Type", colC: "Year", colD: "Client", colE: "Description",
    colF: "Beginning Balance", colG: "EOY USD", colH: "USD Rate", colI: "Col I",
    colJ: "BCA Suhardjo", colK: "BCA Juanda", colL: "Mandiri MP", colM: "BRI Suhardjo",
    colN: "Cash IDR", colO: "Non CB", colP: "PPn In and Out", colQ: "Col Q",
    colR: "Ending Balance", colS: "Outstanding USD",
  },
  account_payables: {
    colA: "Payable", colB: "Year", colC: "Vendor", colD: "Description", colE: "Beginning Balance",
    colF: "EOY USD", colG: "Col G", colH: "Col H", colI: "Col I", colJ: "Col J",
    colK: "BCA Shardjo", colL: "BCA Juanda", colM: "Mandiri Mid Plaza", colN: "BTN",
    colO: "BRI Shardjo", colP: "BRI Tebet", colQ: "Cash IDR", colR: "Non CB",
    colS: "AP In and Out", colT: "Col T", colU: "Ending Balance", colV: "Outstanding USD",
  },
  sales_records: {
    colA: "No", colB: "Invoice No", colC: "Date", colD: "Year", colE: "Billing To",
    colF: "Sales Code", colG: "Description", colH: "Basic Price", colI: "Management Fee",
    colJ: "PPN", colK: "Account Receivable IDR", colL: "Date Received", colM: "BCA Sahardjo",
    colN: "BCA Juanda", colO: "Mandiri Mid Plaza", colP: "Mandiri Plaza Mandiri", colQ: "BRI Tebet",
    colR: "BRI Sahardjo", colS: "BTN", colT: "Bank Raya", colU: "BNI", colV: "Cash IDR",
    colW: "Non CB", colX: "Outstanding IDR", colY: "Blank", colZ: "AP PPn", colAA: "PPh-23",
    colAB: "WAPU", colAC: "Non WAPU", colAD: "Remarks",
  },
  ppn_in_out: {
    colA: "Masa", colB: "Col B", colC: "No Faktur", colD: "Client/Supplier", colE: "Invoice No",
    colF: "Sales", colG: "Status", colH: "PPN", colI: "WAPU", colJ: "PAID", colK: "AP PPN WAPU",
    colL: "Blank", colM: "Non WAPU", colN: "Masukan", colO: "AP PPN Non WAPU", colP: "Ledger",
    colQ: "Sub Ledger-1", colR: "Sub Ledger-2", colS: "Sub Ledger-3",
  },
  inter_account: {
    colB: "Description", colC: "BCA Sahardjo", colD: "BCA Juanda", colE: "Mandiri Mid Plaza",
    colF: "BRI Sahardjo", colG: "BTN", colH: "BJB", colI: "Bank Raya", colJ: "BRI Tebet",
    colK: "Mandiri Plaza Mandiri", colL: "BNI", colM: "Cash IDR", colN: "Non Cash Bank",
    colO: "PPn In and Out",
  },
  depreciation: {
    type: "Category", colA: "Date", colB: "Source", colC: "Description", colD: "Purchase Price",
    colE: "Month", colF: "S/D 2024", colG: "Jan", colH: "Feb", colI: "Mar", colJ: "Apr",
    colK: "May", colL: "Jun", colM: "Jul", colN: "Aug", colO: "Sep", colP: "Oct", colQ: "Nov",
    colR: "Dec", colS: "Total 2025", colT: "S/D 2025", colU: "Book Value",
  },
  financial_transactions: {
    col_a: "Date", col_b: "Description", col_c: "Debit", col_d: "Credit", col_e: "Balance",
    col_f: "Ledger", col_g: "Sub Ledger 1", col_h: "Sub Ledger 2", col_i: "Sub Ledger 3",
    ledger_id: "Ledger (master)", sub_ledger_id: "Sub Ledger 1 (master)", row_no: "Row No",
  },
  fiscal_periods: {
    year: "Year", opening_balance: "Opening Balance", closing_balance: "Closing Balance",
    status: "Status", closed_at: "Closed At", closed_by_id: "Closed By", is_stale: "Needs Recalculation",
  },
  equity_properties: { year: "Year", key: "Item", value: "Value" },
  ledgers: { code: "Code", name: "Name", order_index: "Order", is_active: "Active" },
  sub_ledgers: { ledger_id: "Ledger", code: "Code", name: "Name", is_active: "Active" },
  internal_accounts: {
    bank_id: "Bank", type: "Type", account_no: "Account No", branch: "Branch", swift_code: "SWIFT",
    holder_name: "Holder Name", display_name: "Display Name", display_order: "Display Order",
    is_non_vat_settlement: "Non-VAT Settlement",
  },
  banks: { bank_code: "Bank Code", bank_name: "Bank Name", bank_brand: "Brand", bank_address: "Address" },
};

/** Kolom teknis yang tidak ditampilkan di rincian perubahan. */
export const HIDDEN_COLUMNS = new Set([
  "id", "created_at", "updated_at", "createdAt", "updatedAt",
  "account_receivable_id", "account_payable_id", "sales_record_id", "inter_account_id",
]);

/**
 * Kolom yang tidak ditampilkan per tabel. Bank Statement: saldo berjalan dihitung
 * ulang sesudah setiap perubahan, jadi nilai yang tercatat saat baris dibuat
 * bukan nilai akhirnya. ID Ledger diwakili namanya (col_f/col_g). Nomor urut
 * tetap ditampilkan: yang tercatat saat baris dibuat adalah nomor aslinya.
 */
export const TABLE_HIDDEN_COLUMNS: Record<string, Set<string>> = {
  financial_transactions: new Set(["col_e", "ledger_id", "sub_ledger_id"]),
};

/**
 * Kolom yang ditampilkan menggantikan kolom lain. Perubahan Ledger tercatat di
 * ledger_id (namanya, col_f, tidak dianggap perubahan karena cuma cermin), jadi
 * yang ditunjukkan ke user adalah namanya sebelum dan sesudah.
 */
export const DISPLAY_AS: Record<string, Record<string, string>> = {
  financial_transactions: { ledger_id: "col_f", sub_ledger_id: "col_g" },
};

export const isHidden = (table: string, column: string) =>
  HIDDEN_COLUMNS.has(column) || !!TABLE_HIDDEN_COLUMNS[table]?.has(column);

/** Kolom berubah yang layak ditampilkan, dengan pengganti nama untuk ID. */
export function visibleChanges(table: string, changed: string[]) {
  const out: string[] = [];
  for (const c of changed) {
    const shown = DISPLAY_AS[table]?.[c] ?? c;
    if (!isHidden(table, shown) && !out.includes(shown)) out.push(shown);
  }
  return out;
}

export function columnLabel(table: string, column: string) {
  return COLUMN_LABELS[table]?.[column] ?? COMMON[column] ?? column;
}

export const ACTION_LABELS: Record<string, string> = {
  INSERT: "Created",
  UPDATE: "Edited",
  DELETE: "Deleted",
};
