/**
 * Which spreadsheet account each fixed column in the finance tables stands for.
 *
 * These four tables give every account a column of its own, and the columns are
 * not in the same order twice: receivable has no BTN at all, payable has no
 * Bank Raya, and the sales sheet puts Mandiri Plasa Mandiri where inter-account
 * puts BTN. That is the shape the workbooks arrive in, so the mapping is
 * written out per table rather than guessed.
 *
 * The labels are the keys of SHEET_TO_ACCOUNT in the banks seeder, which is
 * what turns a label into an actual internal_accounts row.
 */
export type ColumnAccountMap = Record<string, string>;

export const INTER_ACCOUNT_COLUMNS: ColumnAccountMap = {
  colC: 'BCA Sho',
  colD: 'BCA Juanda',
  colE: 'Mandiri MP',
  colF: 'BRI Sho',
  colG: 'BTN',
  colH: 'BJB',
  colI: 'Raya',
  colJ: 'BRI Tebet',
  colK: 'Mandiri PM',
  colL: 'BNI',
  colM: 'Cash IDR',
  colN: 'Non CB',
  colO: 'PPn In and Out',
};

export const SALES_RECORD_COLUMNS: ColumnAccountMap = {
  colM: 'BCA Sho',
  colN: 'BCA Juanda',
  colO: 'Mandiri MP',
  colP: 'Mandiri PM',
  colQ: 'BRI Tebet',
  colR: 'BRI Sho',
  colS: 'BTN',
  colT: 'Raya',
  colU: 'BNI',
  colV: 'Cash IDR',
  colW: 'Non CB',
};

export const ACCOUNT_RECEIVABLE_COLUMNS: ColumnAccountMap = {
  colJ: 'BCA Sho',
  colK: 'BCA Juanda',
  colL: 'Mandiri MP',
  colM: 'BRI Sho',
  colN: 'Cash IDR',
  colO: 'Non CB',
  colP: 'PPn In and Out',
};

export const ACCOUNT_PAYABLE_COLUMNS: ColumnAccountMap = {
  colK: 'BCA Sho',
  colL: 'BCA Juanda',
  colM: 'Mandiri MP',
  colN: 'BTN',
  colO: 'BRI Sho',
  colP: 'BRI Tebet',
  colQ: 'Cash IDR',
  colR: 'Non CB',
  // The payable sheet calls it "AP In and Out"; it is the same control account.
  colS: 'PPn In and Out',
};
