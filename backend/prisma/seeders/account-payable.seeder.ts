import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { 
  cleanCurrency, 
  cleanString, 
  isRowEmpty,
  excelDateToJSDate,
} from './utils/excel';

export async function seedAccountPayable(prisma: PrismaClient) {
  await prisma.accountPayable.deleteMany();
  await prisma.taxLedger.deleteMany();
  
  const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'account-payable.xlsx');
  const workbook = XLSX.readFile(filePath);

  // 1. Seed AP Summary
  const apSheet = workbook.Sheets['AP'];
  if (apSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(apSheet, { header: 1 });
    const ap = [];
    
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (isRowEmpty(row)) break;
      
      ap.push({
        colA: cleanString(row[0]),
        colB: row[1] ? parseInt(String(row[1])) : null,
        colC: cleanString(row[2]),
        colD: cleanString(row[3]),
        colE: cleanCurrency(row[4]),
        colF: cleanString(row[5]), 
        colG: cleanString(row[6]),
        colH: cleanString(row[7]),
        colI: cleanCurrency(row[8]), 
        colJ: cleanCurrency(row[9]), 
        colK: cleanCurrency(row[10]), 
        colL: cleanCurrency(row[11]), 
        colM: cleanCurrency(row[12]), 
        colN: cleanCurrency(row[13]), 
        colO: cleanCurrency(row[14]), 
        colP: cleanCurrency(row[15]), 
        colQ: cleanCurrency(row[16]), 
        colR: cleanString(row[17]),   
        colS: cleanCurrency(row[18]), 
        colT: cleanCurrency(row[19]), 
        colU: cleanCurrency(row[20]), 
      });
    }
    await prisma.accountPayable.createMany({ data: ap });
    console.log(`✅ Seeded ${ap.length} records for Account Payable`);
  }

  // 2. Seed AP PPN (WAPU & Non-WAPU)
  const sheets = [
    { name: 'AP PPN WAPU', type: 'WAPU', startRow: 1 },
    { name: 'AP PPN Non WAPU', type: 'NON_WAPU', startRow: 3 }
  ];

  for (const sheetInfo of sheets) {
    const sheet = workbook.Sheets[sheetInfo.name];
    if (sheet) {
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const ppnData = [];
      
      for (let i = sheetInfo.startRow; i < rows.length; i++) {
        const row = rows[i];
        if (isRowEmpty(row)) break;
        
        ppnData.push({
          type: sheetInfo.type as any,
          colA: excelDateToJSDate(row[0]),
          colB: cleanString(row[1]),
          colC: cleanString(row[2]),
          colD: cleanString(row[3]),
          colE: cleanString(row[4]),
          colF: row[5] ? parseInt(String(row[5])) : null,
          colG: cleanString(row[6]),
          colH: cleanCurrency(row[7]),
          colI: cleanCurrency(row[8]),
          colJ: cleanCurrency(row[9]),
          colK: cleanCurrency(row[10]),
          colL: cleanString(row[11]),
          colM: cleanString(row[12]),
          colN: cleanString(row[13]),
          colO: cleanString(row[14]),
        });
      }
      await prisma.taxLedger.createMany({ data: ppnData });
      console.log(`✅ Seeded ${ppnData.length} records for AP Tax Ledger ${sheetInfo.type}`);
    }
  }
}
