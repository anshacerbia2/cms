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
import { seedAccountPayable } from './account-payable.seeder';
import { seedSales } from './sales.seeder';
import { seedDepreciation } from './depreciation.seeder';

export async function seedFinance(prisma: PrismaClient) {
  // Clear existing data to prevent duplicates
  await prisma.salesRecord.deleteMany();
  await prisma.accountReceivable.deleteMany();
  await prisma.financeRevenue.deleteMany();
  await prisma.financeExpense.deleteMany();
  await prisma.profitLossSummary.deleteMany();
  await prisma.balanceSheetItem.deleteMany();
  await prisma.interAccountTransfer.deleteMany();

  const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'finance-report.xlsx');
  const workbook = XLSX.readFile(filePath);

  // Modularized seeders
  await seedAccountPayable(prisma);
  await seedSales(prisma);

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
            bca: cleanCurrency(row[5]),
            mandiri: cleanCurrency(row[6]),
            bri: cleanCurrency(row[7]),
            btn: cleanCurrency(row[8]),
            cashIdr: cleanCurrency(row[9]),
            nonCb: cleanCurrency(row[10]),
            other: cleanCurrency(row[11]),
            total: cleanCurrency(row[12]),
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
        colD: cleanCurrency(row[3]),
        colE: cleanCurrency(row[4]),
        colF: cleanCurrency(row[5]),
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
        colD: cleanCurrency(row[3]),
        colE: cleanCurrency(row[4]),
        colF: cleanCurrency(row[5]),
      });
    }

    await prisma.financeRevenue.createMany({ data: revenues });
    await prisma.financeExpense.createMany({ data: expenses });
    console.log(`✅ Seeded ${revenues.length} Revenues and ${expenses.length} Expenses from Project PL`);
  }

  // --- 3. ASSETS SHEET ---
  await seedDepreciation(prisma);

  // --- 4. BALANCE SHEET ---
  const bsSheet = workbook.Sheets['Balance Sheet 2021'];
  if (bsSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(bsSheet, { header: 1 });
    const bs = [];
    let currentCategory = '';
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (isRowEmpty(row)) continue;
      const label = cleanString(row[1]);
      if (!row[2] && label) { currentCategory = label; continue; }

      bs.push({
        category: currentCategory,
        accountName: label,
        idr: cleanCurrency(row[2]),
        usd: cleanCurrency(row[3]),
        rate: cleanCurrency(row[4]),
      });
    }
    await prisma.balanceSheetItem.createMany({ data: bs });
    console.log(`✅ Seeded ${bs.length} records for Balance Sheet`);
  }

  // --- 4. INTER-ACCOUNT TRANSFERS ---
  const transferSheet = workbook.Sheets['Inter Accounts'];
  if (transferSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(transferSheet, { header: 1 });
    const transfers = [];
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (isRowEmpty(row)) break;
      transfers.push({
        date: cleanString(row[0]),
        description: cleanString(row[1]),
        bca: cleanCurrency(row[2]),
        mandiri: cleanCurrency(row[3]),
        bri: cleanCurrency(row[4]),
        btn: cleanCurrency(row[5]),
        cashIdr: cleanCurrency(row[6]),
        nonCashBank: cleanCurrency(row[7]),
        checker: cleanCurrency(row[8]),
      });
    }
    await prisma.interAccountTransfer.createMany({ data: transfers });
    console.log(`✅ Seeded ${transfers.length} records for Inter-Account Transfers`);
  }
}
