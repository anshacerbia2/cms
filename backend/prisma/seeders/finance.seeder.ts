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

export async function seedFinance(prisma: PrismaClient) {
  // Clear existing data to prevent duplicates (Bank Transaction handled in seedBankMutation)
  await prisma.salesRecord.deleteMany();
  await prisma.accountReceivable.deleteMany();
  await prisma.assetDepreciation.deleteMany();
  await prisma.profitLossSales.deleteMany();
  await prisma.profitLossCost.deleteMany();
  await prisma.profitLossSummary.deleteMany();
  await prisma.balanceSheetItem.deleteMany();
  await prisma.interAccountTransfer.deleteMany();

  const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'financial-report.xlsx');
  const workbook = XLSX.readFile(filePath);

  // Modularized seeders
  await seedAccountPayable(prisma);

  // --- 1. BANK SHEETS ---
  // MIGRATED: Logic moved to seedBankMutation in banks.seeder.ts

  // --- 2. SALES SHEET ---
  const salesSheet = workbook.Sheets['Sales'];
  if (salesSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(salesSheet, { header: 1 });
    const sales = [];
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (isRowEmpty(row)) break;
      sales.push({
        colA: cleanString(row[0]),
        colB: formatExcelDate(row[1]),
        colC: parseInt(String(row[2] || '0')),
        colD: cleanString(row[3]),
        colE: cleanString(row[4]),
        colF: cleanString(row[5]),
        colG: cleanCurrency(row[6]),
        colH: cleanCurrency(row[7]),
        colI: cleanCurrency(row[8]),
        colJ: cleanCurrency(row[9]),
        colL: cleanCurrency(row[11]),
        colM: cleanCurrency(row[12]),
        colN: cleanCurrency(row[13]),
        colO: cleanCurrency(row[14]),
        colP: cleanCurrency(row[15]),
        colQ: cleanCurrency(row[16]),
        colR: cleanCurrency(row[17]),
        colS: cleanCurrency(row[18]),
        colU: cleanCurrency(row[20]),
        colV: cleanCurrency(row[21]),
        colW: cleanCurrency(row[22]),
        colX: cleanCurrency(row[23]),
        colZ: cleanCurrency(row[25]),
      });
    }
    await prisma.salesRecord.createMany({ data: sales });
    console.log(`✅ Seeded ${sales.length} transactions from Sales Module`);
  }

  // --- 3. P&L SHEET ---
  const plSheet = workbook.Sheets['PL'];
  if (plSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(plSheet, { header: 1 });
    let mode: 'SALES' | 'COGS' | 'EXPENSE' | 'SUMMARY' = 'SALES';
    let currentSubCategory = '';
    const sales = [];
    const costs = [];
    const summaries = [];

    for (let i = 5; i < rows.length; i++) {
      const row = rows[i];
      if (isRowEmpty(row)) continue;

      const label = cleanString(row[1]);
      if (label === 'C O G S') { mode = 'COGS'; continue; }
      if (label === 'EXPENSES') { mode = 'EXPENSE'; continue; }
      if (label === 'Total Expense' || label === 'OPERATING PROFIT') { mode = 'SUMMARY'; }

      if (mode === 'SALES' && row[0]) {
        sales.push({
          accountName: label,
          gross: cleanCurrency(row[2]),
          vat: cleanCurrency(row[3]),
          apVat: cleanCurrency(row[4]),
          creditNote: cleanCurrency(row[5]),
          apCreditNote: cleanCurrency(row[6]),
          netSales: cleanCurrency(row[11]),
        });
      } else if (mode === 'COGS' || mode === 'EXPENSE') {
        if (!row[0] && label && !label.includes('Total')) {
          currentSubCategory = label;
          continue;
        }
        if (label && !label.includes('Total')) {
          costs.push({
            accountName: label,
            category: mode,
            subCategory: currentSubCategory,
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
      } else if (mode === 'SUMMARY') {
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
    await prisma.profitLossSales.createMany({ data: sales });
    await prisma.profitLossCost.createMany({ data: costs });
    await prisma.profitLossSummary.createMany({ data: summaries });
    console.log(`✅ Seeded ${sales.length + costs.length + summaries.length} records for PL Module`);
  }

  // --- 4. AR SHEET ---
  const arSheet = workbook.Sheets['AR'];
  if (arSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(arSheet, { header: 1 });
    const ar = [];
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (isRowEmpty(row)) break;

      ar.push({
        colB: cleanString(row[1]),
        colC: cleanString(row[2]),
        colD: cleanString(row[3]),
        colE: cleanString(row[4]),
        colF: cleanCurrency(row[5]),
        colG: cleanCurrency(row[6]),
        colH: cleanCurrency(row[7]),
        colJ: cleanCurrency(row[9]),
        colK: cleanCurrency(row[10]),
        colL: cleanCurrency(row[11]),
        colM: cleanCurrency(row[12]),
        colN: cleanCurrency(row[13]),
        colO: cleanCurrency(row[14]),
        colP: cleanCurrency(row[15]),
        colR: cleanCurrency(row[17]),
        colS: cleanCurrency(row[18]),
        colT: cleanCurrency(row[19]),
        colU: cleanCurrency(row[20]),
        colV: cleanCurrency(row[21]),
      });
    }
    await prisma.accountReceivable.createMany({ data: ar });
    console.log(`✅ Seeded ${ar.length} records for AR Module`);
  }

  // AP module seeding has been moved to ap.seeder.ts


  // --- 6. ASSETS SHEET ---
  const assetSheet = workbook.Sheets['Deprec 2021'];
  if (assetSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(assetSheet, { header: 1 });
    const assets = [];
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (isRowEmpty(row)) break;
      assets.push({
        purchaseDate: cleanString(row[0]),
        bankRef: cleanString(row[1]),
        assetName: cleanString(row[2]),
        purchasePrice: cleanCurrency(row[3]),
        usefulLife: parseInt(String(row[4] || '0')),
        accumulated2020: cleanCurrency(row[5]),
        jan: cleanCurrency(row[6]),
        feb: cleanCurrency(row[7]),
        mar: cleanCurrency(row[8]),
        apr: cleanCurrency(row[9]),
        may: cleanCurrency(row[10]),
        jun: cleanCurrency(row[11]),
        jul: cleanCurrency(row[12]),
        aug: cleanCurrency(row[13]),
        sep: cleanCurrency(row[14]),
        oct: cleanCurrency(row[15]),
        nov: cleanCurrency(row[16]),
        dec: cleanCurrency(row[17]),
        total2021: cleanCurrency(row[18]),
        accumulated2021: cleanCurrency(row[19]),
        bookValue: cleanCurrency(row[20]),
      });
    }
    await prisma.assetDepreciation.createMany({ data: assets });
    console.log(`✅ Seeded ${assets.length} records for Assets Module`);
  }

  // --- 7. BALANCE SHEET ---
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

  // --- 8. INTER-ACCOUNT TRANSFERS ---
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
