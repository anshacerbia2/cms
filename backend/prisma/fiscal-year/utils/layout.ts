import * as fs from 'fs';
import * as path from 'path';
import { cleanCurrency, cleanString, excelDateToJSDate } from '../../utils/excel';

/**
 * The fiscal year this run writes to, and the folder its workbooks sit in.
 *
 * Both were constants, which is the only reason a second copy of every seeder
 * had to exist for a second year. They are set once at startup instead.
 */
export let FISCAL_YEAR = 2026;
export let DATA_DIR = 'seed-data-2026';

export function useFiscalYear(year: number, dir: string) {
  FISCAL_YEAR = year;
  DATA_DIR = dir;
}

/**
 * Collapses a spreadsheet header into a comparison key: lowercase, with
 * everything that is not a letter or digit removed. This is what lets
 * "B N I", "PPh-23" and "NON CB" match "bni", "pph23" and "noncb", so a
 * column is found by what it is called rather than where it sits.
 */
export function normalizeLabel(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isBlankRow(row: any[] | undefined): boolean {
  if (!row || row.length === 0) return true;
  return row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '');
}

export function isNumeric(value: any): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  const text = String(value ?? '').trim();
  return text !== '' && !Number.isNaN(Number(text));
}

/** One database column, and the header that should feed it. */
export type SlotSpec = {
  /** The model field this fills, e.g. "colM". */
  slot: string;
  /** Normalized header keys that mean this column, in order of preference. */
  headers: string[];
  /** How the cell is converted. */
  kind: 'text' | 'money' | 'date' | 'int';
};

export type ColumnMap = {
  /** slot -> column index in the sheet. Absent when the workbook omits it. */
  indexes: Record<string, number>;
  /** Slots this workbook has no column for; they are written as null. */
  missing: string[];
  /** Headers present in the sheet that no slot claims. */
  unclaimed: string[];
};

/**
 * Matches the sheet's headers against the slots the database and UI expect.
 *
 * Mapping by name rather than position is what makes a workbook that drops a
 * bank safe to load: the remaining values still land in the column the UI
 * labels for them, and the dropped one becomes null instead of shifting every
 * later column by one.
 */
export function buildColumnMap(headerRow: any[], specs: SlotSpec[]): ColumnMap {
  const byKey = new Map<string, number>();
  headerRow.forEach((cell, index) => {
    const key = normalizeLabel(cell);
    // First occurrence wins, so a repeated header cannot steal a claimed column.
    if (key && !byKey.has(key)) byKey.set(key, index);
  });

  const indexes: Record<string, number> = {};
  const missing: string[] = [];
  const claimed = new Set<string>();

  for (const spec of specs) {
    const key = spec.headers.find((h) => byKey.has(h));
    if (key === undefined) {
      missing.push(spec.slot);
      continue;
    }
    indexes[spec.slot] = byKey.get(key)!;
    claimed.add(key);
  }

  const unclaimed = [...byKey.keys()].filter((k) => !claimed.has(k));
  return { indexes, missing, unclaimed };
}

/**
 * Matches only the headers that sit between two column positions.
 *
 * Some of these sheets use the same word twice - "IDR" names both the
 * end-of-year balance and the outstanding balance - so a single pass over the
 * whole row would give the first one both slots. Restricting the search to the
 * block a slot belongs to keeps the two apart without relying on the group
 * label above them, which carries a year and therefore changes every book.
 *
 * Indexes come back as positions in the original row, not in the window.
 */
export function buildColumnMapInRange(
  headerRow: any[],
  specs: SlotSpec[],
  from: number,
  to: number,
): ColumnMap {
  // Blanking outside the window rather than slicing keeps the indexes absolute.
  const windowed = headerRow.map((cell, index) => (index >= from && index <= to ? cell : ''));
  return buildColumnMap(windowed, specs);
}

/**
 * Finds this year's workbook by what its name says it holds.
 *
 * The files arrive named after the day they were exported
 * ("PCMI-AR-14Sept26.xlsx"), so a hard-coded filename would break on every new
 * send. The name is split on its separators and each piece compared whole:
 * "AR" is a piece of "PCMI-AR-14Sept26", but never a stray "ar" inside a longer
 * word, which is what matching on the raw text would give.
 */
export function findWorkbook(keywords: string[]): string | null {
  const dir = path.join(process.cwd(), 'prisma', DATA_DIR);
  if (!fs.existsSync(dir)) return null;

  const wanted = keywords.map((k) => k.toLowerCase());
  const match = fs
    .readdirSync(dir)
    .filter((name) => /\.xlsx?$/i.test(name) && !name.startsWith('~$'))
    .find((name) => {
      const pieces = name
        .replace(/\.xlsx?$/i, '')
        .split(/[^A-Za-z]+/)
        .map((piece) => piece.toLowerCase())
        .filter(Boolean);
      return pieces.some((piece) => wanted.includes(piece));
    });

  return match ? path.join(dir, match) : null;
}


/**
 * The exchange rate sits in the column after "USD" and is headed by the rate
 * itself ("14,500.00"), which changes every year, so it cannot be found by
 * name. It is taken by position, and only when that column has no heading of
 * its own to claim it.
 */
export function rateColumnAfter(headerRow: any[], usdIndex: number | undefined): number | undefined {
  if (usdIndex === undefined) return undefined;
  const next = usdIndex + 1;
  const label = String(headerRow[next] ?? '').trim();
  if (label === '') return next;
  // A bare number is the rate itself rather than a name for something else.
  return isNumeric(label.replace(/,/g, '')) ? next : undefined;
}

/**
 * Says which columns the workbook did not supply, and which it supplied that
 * nothing reads.
 *
 * A heading with no column behind it is only worth shouting about when there
 * are figures under it. Warning on the empty ones too would mean a warning on
 * every load, which is how a real one gets missed.
 */
export function reportLayout(
  maps: ColumnMap[],
  specs: SlotSpec[],
  readByPosition: string[] = [],
  data?: {
    header: any[];
    rows: any[][];
    firstDataRow: number;
    /** Headers whose figures were kept against an account instead. */
    keptAsRelation?: string[];
  },
) {
  const missing = maps.flatMap((m) => m.missing);
  const ignored = new Set(readByPosition.map(normalizeLabel));
  const unclaimed = maps.flatMap((m) => m.unclaimed).filter((k) => !ignored.has(k));

  if (missing.length > 0) {
    const names = missing
      .map((s) => `${s} (${specs.find((x) => x.slot === s)!.headers[0]})`)
      .join(', ');
    console.warn(`⚠️  Not in this workbook, stored as null: ${names}`);
  }

  if (unclaimed.length === 0) return;

  if (!data) {
    console.warn(`⚠️  Column(s) in the workbook that nothing reads: ${unclaimed.join(', ')}`);
    return;
  }

  const kept = new Set((data.keptAsRelation ?? []).map(normalizeLabel));
  const relational: string[] = [];
  const withFigures: string[] = [];
  const empty: string[] = [];
  for (const key of unclaimed) {
    // This table has no column of its own for the account, but the figures
    // went in against the account itself, which is the point of the relation.
    if (kept.has(key)) {
      relational.push(key);
      continue;
    }
    const index = data.header.findIndex((cell) => normalizeLabel(cell) === key);
    const used =
      index >= 0 &&
      data.rows
        .slice(data.firstDataRow)
        .some((row) => {
          const text = String((row || [])[index] ?? '').trim();
          if (text === '' || text === '-') return false;
          const value = Number(text.replace(/[^0-9.-]/g, ''));
          return Number.isNaN(value) ? true : value !== 0;
        });
    (used ? withFigures : empty).push(key);
  }

  if (relational.length > 0) {
    console.log(
      `🆕 No fixed column for: ${relational.join(', ')} — kept against the account instead.`,
    );
  }
  if (withFigures.length > 0) {
    console.error(
      `❌ Column(s) holding figures that nothing can take, LOST: ${withFigures.join(', ')}`,
    );
  }
  if (empty.length > 0) {
    console.warn(`ℹ️  Column(s) present but empty, ignored: ${empty.join(', ')}`);
  }
}

/** Says how much was left below the blank row, so a truncated load is never silent. */
export function reportTail(rows: any[][], stoppedAt: number) {
  if (stoppedAt < 0) return;
  const below = rows.slice(stoppedAt + 1).filter((row) => !isBlankRow(row)).length;
  if (below > 0) {
    console.warn(
      `ℹ️  Stopped at the blank row on line ${stoppedAt + 1}; ${below} further non-empty row(s) below were not read.`,
    );
  }
}

/** Converts one cell the way its slot expects, so every seeder reads alike. */
export function readCell(value: any, kind: SlotSpec['kind']) {
  switch (kind) {
    case 'money':
      return cleanCurrency(value);
    case 'int': {
      // Whole cell or nothing. Stripping the letters out of a label like
      // "AP PPn 2025" would turn a ledger name into a fiscal year.
      const text = String(value ?? '').trim().replace(/[,\s]/g, '');
      return /^-?\d+$/.test(text) ? parseInt(text, 10) : null;
    }
    case 'date':
      return excelDateToJSDate(value);
    default:
      return cleanString(value);
  }
}
