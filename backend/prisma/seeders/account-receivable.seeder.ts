import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { 
  cleanCurrency, 
  cleanString, 
  isRowEmpty,
} from './utils/excel';

export async function seedAccountReceivable(prisma: PrismaClient) {
  await prisma.accountReceivable.deleteMany();
  
  const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'account-receiveable.xlsx');
  const workbook = XLSX.readFile(filePath);
  const arSheet = workbook.Sheets['AR'];
  if (!arSheet) return;

  const rows: any[][] = XLSX.utils.sheet_to_json(arSheet, { header: 1 });
  const ar = [];
  
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (isRowEmpty(row)) break;
    
    // Mapping mirror to AP structure but using AR specific columns from analysis
    ar.push({
      colA: cleanString(row[0]),   
      colB: cleanString(row[1]),   // Type
      colC: cleanString(row[2]),   // Year
      colD: cleanString(row[3]),   // Vendor (Client)
      colE: cleanString(row[4]),   // DESCRIPTION
      colF: cleanCurrency(row[5]), // IDR
      colG: cleanCurrency(row[6]), // USD
      colH: cleanCurrency(row[7]), // Rate
      colI: cleanString(row[8]),   
      colJ: cleanCurrency(row[9]), // BCA Sahardjo
      colK: cleanCurrency(row[10]), // BCA Juanda
      colL: cleanCurrency(row[11]), // MANDIRI MP
      colM: cleanCurrency(row[12]), // BRI Sho
      colN: cleanCurrency(row[13]), // Cash IDR
      colO: cleanCurrency(row[14]), // Non CB
      colP: cleanCurrency(row[15]), // AP PPN Non WAPU
      colQ: cleanString(row[16]),   
      colR: cleanCurrency(row[17]), // OUTSTANDING IDR
    });
  }

  await prisma.accountReceivable.createMany({ data: ar });
  console.log(`✅ Seeded ${ar.length} records for Account Receivable (New File)`);
}
