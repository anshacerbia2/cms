import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { 
  cleanCurrency, 
  cleanString, 
  isRowEmpty,
  excelDateToJSDate
} from './utils/excel';

export async function seedSales(prisma: PrismaClient) {
  // Clear existing sales records
  await prisma.salesRecord.deleteMany({});
  
  const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'sales.xlsx');
  const workbook = XLSX.readFile(filePath);
  
  // Use the first sheet or find one named 'Sales'
  const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('sales')) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  if (!sheet) {
    console.error(`❌ Could not find Sales sheet in ${filePath}`);
    return;
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const sales = [];

  // Start from row 5 (index 4)
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (isRowEmpty(row)) break;

    sales.push({
      colA: cleanString(row[0]),               // No
      colB: cleanString(row[1]),               // Invoice No
      colC: excelDateToJSDate(row[2]),         // Date
      colD: !isNaN(parseInt(String(row[3]))) ? parseInt(String(row[3])) : null, // Year
      colE: cleanString(row[4]),               // Billing To
      colF: cleanString(row[5]),               // Sales Code
      colG: cleanString(row[6]),               // Description
      colH: cleanCurrency(row[7]),             // Basic Price
      colI: cleanCurrency(row[8]),             // Management Fee
      colJ: cleanCurrency(row[9]),             // PPN
      colK: cleanCurrency(row[10]),            // AR IDR
      colL: excelDateToJSDate(row[11]),        // Date Received
      colM: cleanCurrency(row[12]),            // BCA Sahardjo
      colN: cleanCurrency(row[13]),            // BCA Juanda
      colO: cleanCurrency(row[14]),            // Mandiri Mid Plaza
      colP: cleanCurrency(row[15]),            // Mandiri Plasa Mandiri
      colQ: cleanCurrency(row[16]),            // BRI Tebet
      colR: cleanCurrency(row[17]),            // BRI Sahardjo
      colS: cleanCurrency(row[18]),            // BTN
      colT: cleanCurrency(row[19]),            // Bank Raya
      colU: cleanCurrency(row[20]),            // BNI
      colV: cleanCurrency(row[21]),            // Cash IDR
      colW: cleanCurrency(row[22]),            // Non CB
      colX: cleanCurrency(row[23]),            // Outstanding IDR
      colY: cleanString(row[24]),              // colY (Text)
      colZ: cleanCurrency(row[25]),            // AP PPN
      colAA: cleanCurrency(row[26]),           // PPh 23
      colAB: cleanCurrency(row[27]),           // WAPU
      colAC: cleanCurrency(row[28]),           // NON WAPU
      colAD: cleanString(row[29]),             // Remarks
    });
  }

  if (sales.length > 0) {
    await prisma.salesRecord.createMany({ data: sales });
    console.log(`✅ Seeded ${sales.length} transactions from Sales Module (${filePath})`);
  }
}
