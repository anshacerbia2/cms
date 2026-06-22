import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { 
  cleanCurrency, 
  cleanString, 
  isRowEmpty,
  excelDateToJSDate,
} from './utils/excel';

export async function seedPpnInOut(prisma: PrismaClient) {
  console.log('🌱 Seeding PPN In/out...');
  await prisma.ppnInOut.deleteMany();
  
  const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'ppn-in-out.xlsx');
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Assuming first sheet
    const sheet = workbook.Sheets[sheetName];
    
    if (sheet) {
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const records = [];
      
      // Starts from row 4 (index 3)
      for (let i = 3; i < rows.length; i++) {
        const row = rows[i];
        if (isRowEmpty(row)) break;
        
        const dateA = excelDateToJSDate(row[0]);
        
        records.push({
          colA: dateA,
          colB: cleanString(row[1]),
          colC: cleanString(row[2]),
          colD: cleanString(row[3]),
          colE: cleanString(row[4]),
          colF: row[5] ? parseInt(String(row[5])) : null,
          colG: cleanCurrency(row[6]),
          colH: cleanCurrency(row[7]),
          colI: cleanCurrency(row[8]),
          colJ: cleanCurrency(row[9]),
          colK: cleanCurrency(row[10]),
          colL: cleanString(row[11]),
          colM: cleanCurrency(row[12]),
          colN: cleanCurrency(row[13]),
          colO: cleanCurrency(row[14]),
          colP: cleanString(row[15]),
          colQ: cleanString(row[16]),
          colR: cleanString(row[17]),
          colS: cleanString(row[18]),
          tagYear: 2025,
        });
      }
      
      await prisma.ppnInOut.createMany({ data: records });
      console.log(`✅ Seeded ${records.length} records for PPN In/out`);
    }
  } catch (error) {
    console.log(`⚠️ Warning: Could not seed PPN In/out. File ppn-in-out.xlsx might be missing or corrupted.`);
  }
}
