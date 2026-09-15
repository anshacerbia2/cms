import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { 
  excelDateToJSDate, 
  cleanCurrency, 
  cleanString, 
  isRowEmpty,
  formatExcelDate
} from './utils/excel';

export async function seedFinance(prisma: PrismaClient) {
  // Only the three tables this seeder actually fills. It used to clear sales
  // records and receivables as well, which it has never written: the sales
  // seeder owns one and the receivable seeder the other, so a run of this left
  // whichever of them had gone first with nothing.
  await prisma.financeRevenue.deleteMany();
  await prisma.financeExpense.deleteMany();
  await prisma.profitLossSummary.deleteMany();

  const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'finance-report.xlsx');
  const workbook = XLSX.readFile(filePath);

  // --- 1. P&L SUMMARY (from 'PL' sheet) ---
  const plSheet = workbook.Sheets['PL'];
  if (plSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(plSheet, { header: 1 });
    const summaries = [];
    let mode: 'SUMMARY' | 'OTHER' = 'OTHER';

    for (let i = 5; i < rows.length; i++) {
      const row = rows[i];
      if (isRowEmpty(row)) continue;
      const label = cleanString(row[1]);
      
      if (label === 'Total Expense' || label === 'OPERATING PROFIT' || label === 'NET PROFIT') {
        mode = 'SUMMARY';
      }

      if (mode === 'SUMMARY') {
        if (label && !label.includes('Total Revenue')) {
          summaries.push({
            category: label,
            bca: cleanCurrency(row[5]) ?? 0,
            mandiri: cleanCurrency(row[6]) ?? 0,
            bri: cleanCurrency(row[7]) ?? 0,
            btn: cleanCurrency(row[8]) ?? 0,
            cashIdr: cleanCurrency(row[9]) ?? 0,
            nonCb: cleanCurrency(row[10]) ?? 0,
            other: cleanCurrency(row[11]) ?? 0,
            total: cleanCurrency(row[12]) ?? 0,
          });
        }
      }
    }
    await prisma.profitLossSummary.createMany({ data: summaries });
  }

  // --- 2. REVENUE & EXPENSES (from 'PL per Project' sheet) ---
  const projectPlSheet = workbook.Sheets['PL per Project'];
  if (projectPlSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(projectPlSheet, { header: 1 });
    const revenues = [];
    const expenses = [];

    // Data 1: Revenue (Rows 5 - 49)
    for (let i = 4; i < 49; i++) {
      const row = rows[i];
      if (!row || isRowEmpty(row)) continue;
      if (!row[1]) continue; 

      revenues.push({
        colA: cleanString(row[0]),
        colB: cleanString(row[1]),
        colC: cleanString(row[2]),
        colD: cleanCurrency(row[3]) ?? 0,
        colE: cleanCurrency(row[4]) ?? 0,
        colF: cleanCurrency(row[5]) ?? 0,
      });
    }

    // Data 2: Expenses (Rows 53 - 483)
    for (let i = 52; i < 483; i++) {
      const row = rows[i];
      if (!row || isRowEmpty(row)) continue;

      expenses.push({
        colA: cleanString(row[0]),
        colB: row[1] ? excelDateToJSDate(row[1]) : null,
        colC: cleanString(row[2]),
        colD: cleanCurrency(row[3]) ?? 0,
        colE: cleanCurrency(row[4]) ?? 0,
        colF: cleanCurrency(row[5]) ?? 0,
      });
    }

    await prisma.financeRevenue.createMany({ data: revenues });
    await prisma.financeExpense.createMany({ data: expenses });
    console.log(`✅ Seeded ${revenues.length} Revenues and ${expenses.length} Expenses from Project PL`);
  }


}
