/**
 * The fiscal year every seeder in this folder writes to.
 */
export const FISCAL_YEAR = 2026;

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
