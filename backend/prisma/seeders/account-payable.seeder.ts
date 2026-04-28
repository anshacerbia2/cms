import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { 
  cleanCurrency, 
  cleanString, 
  isRowEmpty,
} from './utils/excel';

export async function seedAccountPayable(prisma: PrismaClient) {
  await prisma.accountPayable.deleteMany();
  
  const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'account-payable.xlsx');
  const workbook = XLSX.readFile(filePath);
  const apSheet = workbook.Sheets['AP'];
  if (!apSheet) return;

  const rows: any[][] = XLSX.utils.sheet_to_json(apSheet, { header: 1 });
  const ap = [];
  
  for (let i = 3; i < rows.length; i++) {
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
  console.log(`✅ Seeded ${ap.length} records for Account Payable Module`);
}
