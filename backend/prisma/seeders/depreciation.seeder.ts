import { PrismaClient, DepreciationType } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { 
  excelDateToJSDate, 
  cleanCurrency, 
  cleanString, 
  isRowEmpty 
} from './utils/excel';

export async function seedDepreciation(prisma: PrismaClient) {
  await prisma.depreciation.deleteMany();
  const assetFilePath = path.join(process.cwd(), 'prisma', 'seed-data', 'depreciation.xlsx');
  const assetWorkbook = XLSX.readFile(assetFilePath);
  const assetSheet = assetWorkbook.Sheets[assetWorkbook.SheetNames[0]];

  if (assetSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(assetSheet, { header: 1 });
    const assets = [];

    // Loop 1: Office Equipment (Rows 6 to 87)
    for (let i = 4; i < 87; i++) {
      const row = rows[i];
      if (!row || isRowEmpty(row)) continue;

      assets.push({
        colA: excelDateToJSDate(row[0]),
        colB: cleanString(row[1]),
        colC: cleanString(row[2]),
        colD: cleanCurrency(row[3]),
        colE: parseInt(String(row[4] || '0')),
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
        type: DepreciationType.OFFICE_EQUIPMENT,
        tagYear: 2025,
      });
    }

    // Loop 2: Vehicle (Rows 92 to 100)
    for (let i = 90; i < 100; i++) {
      const row = rows[i];
      if (!row || isRowEmpty(row)) continue;

      assets.push({
        colA: excelDateToJSDate(row[0]),
        colB: cleanString(row[1]),
        colC: cleanString(row[2]),
        colD: cleanCurrency(row[3]),
        colE: parseInt(String(row[4] || '0')),
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
        type: DepreciationType.VEHICLE,
        tagYear: 2025,
      });
    }

    await prisma.depreciation.createMany({ data: assets });
    console.log(`✅ Seeded ${assets.length} records for Assets Module (Depreciation)`);
  }
}
