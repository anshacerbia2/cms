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
    
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (isRowEmpty(row)) break;
      
      ap.push({
        colA: cleanString(row[0]),           // Payable (Supplier, Deposit)
        colB: row[1] ? parseInt(String(row[1])) : null, // Year
        colC: cleanString(row[2]),           // Vendor
        colD: cleanString(row[3]),           // Description
        colE: cleanCurrency(row[4]),         // EOY IDR
        colF: cleanCurrency(row[5]),         // EOY USD
        colG: cleanCurrency(row[6]),         // col G
        colH: cleanString(row[7]),           // col H (string)
        colI: cleanString(row[8]),           // col I (string)
        colJ: cleanString(row[9]),           // col J (Blank, string)
        colK: cleanCurrency(row[10]),        // BCA Shardjo
        colL: cleanCurrency(row[11]),        // BCA Juanda
        colM: cleanCurrency(row[12]),        // Mandiri Mid Plaza
        colN: cleanCurrency(row[13]),        // BTN
        colO: cleanCurrency(row[14]),        // BRI Shardjo
        colP: cleanCurrency(row[15]),        // BRI Tebet
        colQ: cleanCurrency(row[16]),        // Cash IDR
        colR: cleanCurrency(row[17]),        // Non CB
        colS: cleanCurrency(row[18]),        // AP In and Out
        colT: cleanString(row[19]),          // col T (Blank, string)
        colU: cleanCurrency(row[20]),        // Outstanding IDR
        colV: cleanCurrency(row[21]),        // Outstanding USD
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
