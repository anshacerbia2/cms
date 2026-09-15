import { PrismaClient, Prisma, DepreciationType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { cleanCurrency, cleanString, excelDateToJSDate } from '../seeders/utils/excel';
import { FISCAL_YEAR, isNumeric, normalizeLabel } from './utils/layout';

const WORKBOOK = 'PCMI-Depreciation-14Sept26.xlsx';

/**
 * Section heading -> the type stored on each asset beneath it. The 2026
 * workbook adds an Intangible Asset block that 2025 did not have; the enum
 * already carries the value, so it needs no schema change.
 */
const SECTIONS: Record<string, DepreciationType> = {
  officeequipment: DepreciationType.OFFICE_EQUIPMENT,
  vehicle: DepreciationType.VEHICLE,
  intangibleasset: DepreciationType.INTANGIBLE_ASSET,
};

/**
 * Unlike the other 2026 workbooks this one kept its columns: A-U still mean
 * the same things, and only the rows moved. So the columns are read by
 * position and the sections are found by their heading.
 */
const PURCHASE_PRICE_COL = 3;
const USEFUL_LIFE_COL = 4;

/** Confirms the columns still sit where this seeder reads them. */
function headerLooksRight(rows: any[][]): boolean {
  return rows.some(
    (row) =>
      normalizeLabel((row || [])[PURCHASE_PRICE_COL]) === 'hargabeli' &&
      normalizeLabel((row || [])[USEFUL_LIFE_COL]) === 'bulan',
  );
}

export async function seedDepreciation2026(prisma: PrismaClient, workbook?: XLSX.WorkBook) {
  console.log(`🏢 Seeding ${FISCAL_YEAR} depreciation register...`);

  let wb = workbook;
  if (!wb) {
    const filePath = path.join(process.cwd(), 'prisma', 'seed-data-2026', WORKBOOK);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Workbook not found at: ${filePath}`);
      return;
    }
    wb = XLSX.readFile(filePath);
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

  if (!headerLooksRight(rows)) {
    console.error('❌ No "Harga Beli"/"Bulan" header in the expected columns — nothing seeded.');
    return;
  }

  const removed = await prisma.depreciation.deleteMany({ where: { tagYear: FISCAL_YEAR } });
  if (removed.count > 0) console.log(`🧹 Cleared ${removed.count} existing ${FISCAL_YEAR} rows.`);

  const assets: Prisma.DepreciationCreateManyInput[] = [];
  const counts: Record<string, number> = {};
  let section: DepreciationType | null = null;

  for (const row of rows) {
    const heading = SECTIONS[normalizeLabel((row || [])[2])];
    if (heading) {
      section = heading;
      counts[section] = counts[section] ?? 0;
      continue;
    }
    if (!section) continue;

    // An asset is a row that names something and states a useful life in
    // months. The subtotal and grand-total rows carry neither, so they are
    // skipped without having to know which row they land on.
    const name = cleanString((row || [])[2]);
    const life = (row || [])[USEFUL_LIFE_COL];
    if (name === '' || !isNumeric(life) || Number(life) <= 0) continue;

    assets.push({
      colA: excelDateToJSDate(row[0]),
      colB: cleanString(row[1]),
      colC: name,
      colD: cleanCurrency(row[3]),
      colE: parseInt(String(life), 10),
      colF: cleanCurrency(row[5]),
      colG: cleanCurrency(row[6]),
      colH: cleanCurrency(row[7]),
      colI: cleanCurrency(row[8]),
      colJ: cleanCurrency(row[9]),
      colK: cleanCurrency(row[10]),
      colL: cleanCurrency(row[11]),
      colM: cleanCurrency(row[12]),
      colN: cleanCurrency(row[13]),
      colO: cleanCurrency(row[14]),
      colP: cleanCurrency(row[15]),
      colQ: cleanCurrency(row[16]),
      colR: cleanCurrency(row[17]),
      colS: cleanCurrency(row[18]),
      colT: cleanCurrency(row[19]),
      colU: cleanCurrency(row[20]),
      type: section,
      tagYear: FISCAL_YEAR,
    });
    counts[section]++;
  }

  if (assets.length === 0) {
    console.warn('⚠️  No asset rows found — nothing seeded.');
    return;
  }

  await prisma.depreciation.createMany({ data: assets });

  const breakdown = Object.entries(counts)
    .map(([type, n]) => `${type} ${n}`)
    .join(', ');
  console.log(`✅ Seeded ${assets.length} assets for ${FISCAL_YEAR} (${breakdown}).`);

  const absent = Object.values(SECTIONS).filter((t) => counts[t] === undefined);
  if (absent.length > 0) {
    console.warn(`⚠️  Section(s) not present in this workbook: ${absent.join(', ')}`);
  }
}
