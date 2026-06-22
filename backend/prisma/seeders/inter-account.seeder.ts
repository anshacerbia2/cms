import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { 
  cleanCurrency, 
  cleanString, 
  isRowEmpty,
} from './utils/excel';

export async function seedInterAccount(prisma: PrismaClient) {
  console.log('🌱 Seeding Inter Account...');
  await prisma.interAccount.deleteMany();
  
  const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'inter-account.xlsx');
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Assuming first sheet
    const sheet = workbook.Sheets[sheetName];
    
    if (sheet) {
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const records = [];
      
      // Starts from row 5 (index 4)
      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        if (isRowEmpty(row)) break;
        
        records.push({
          colA: "",
          colB: cleanString(row[0]),
          colC: cleanCurrency(row[1]),
          colD: cleanCurrency(row[2]),
          colE: cleanCurrency(row[3]),
          colF: cleanCurrency(row[4]),
          colG: cleanCurrency(row[5]),
          colH: cleanCurrency(row[6]),
          colI: cleanCurrency(row[7]),
          colJ: cleanCurrency(row[8]),
          colK: cleanCurrency(row[9]),
          colL: cleanCurrency(row[10]),
          colM: cleanCurrency(row[11]),
          colN: cleanCurrency(row[12]),
          colO: cleanCurrency(row[13]),
          colP: cleanCurrency(row[14]),
          tagYear: 2025,
        });
      }
      
      await prisma.interAccount.createMany({ data: records });
      console.log(`✅ Seeded ${records.length} records for Inter Account`);
    }
  } catch (error) {
    console.log(`⚠️ Warning: Could not seed Inter Account. File inter-account.xlsx might be missing or corrupted. Error: `, error);
  }
}
