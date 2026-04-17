import * as XLSX from 'xlsx';
import path from 'path';
import { Prisma } from '@prisma/client';

// Helper to convert Excel date to JS Date
function excelDateToJSDate(serial: number | string): Date {
  if (typeof serial === 'string') return new Date(serial);
  if (!serial || isNaN(Number(serial))) return new Date();
  const utc_days = Math.floor(Number(serial) - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

// Helper to clean currency strings to Decimal compatible numbers
function cleanCurrency(val: any): Prisma.Decimal {
  let num = 0;
  if (typeof val === 'number') {
    num = val;
  } else if (val && typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    num = parseFloat(cleaned) || 0;
  }
  return new Prisma.Decimal(num.toFixed(4));
}

/**
 * Discover headers dynamically based on user requirements:
 * 1. Reference longest row for width.
 * 2. Prioritize Child Header over Parent.
 * 3. Use unknown_N for missing.
 */
function isRowEmpty(row: any[]): boolean {
  if (!row || !Array.isArray(row)) return true;
  return row.every(val => val === null || val === undefined || String(val).trim() === '');
}

/**
 * Discover headers dynamically:
 */
function discoverHeaders(rows: any[][], headerRows: number[], maxColLimit: number): string[] {
  const headers: string[] = [];
  for (let col = 0; col < maxColLimit; col++) {
    let headerName = '';
    const childRowIdx = headerRows[headerRows.length - 1];
    const childVal = rows[childRowIdx] ? rows[childRowIdx][col] : null;
    const parentRowIdx = headerRows.length > 1 ? headerRows[0] : -1;
    const parentVal = parentRowIdx >= 0 && rows[parentRowIdx] ? rows[parentRowIdx][col] : null;
    if (childVal && String(childVal).trim()) headerName = String(childVal).trim();
    else if (parentVal && String(parentVal).trim()) headerName = String(parentVal).trim();
    else headerName = `col${col}`; // Consistent 0-based naming
    headers.push(headerName);
  }
  return headers;
}

export async function seedFinance(prisma: any) {
  console.log('🚀 Executing Universal Financial Data Importer...');
  const filePath = path.resolve('prisma/seed-data/financial-report.xlsx');
  const workbook = XLSX.readFile(filePath);

  // 0. Clean Slate
  console.log('🗑️ Clearing old financial data...');
  await Promise.all([
    prisma.financialTransaction.deleteMany({}),
    prisma.salesRecord.deleteMany({}),
    prisma.accountReceivable.deleteMany({}),
    prisma.accountPayable.deleteMany({}),
    prisma.assetDepreciation.deleteMany({}),
    prisma.profitLossSales.deleteMany({}),
    prisma.profitLossCost.deleteMany({}),
    prisma.profitLossSummary.deleteMany({}),
    prisma.balanceSheetItem.deleteMany({}),
    prisma.interAccountTransfer.deleteMany({}),
  ]);

  // --- 1. BANK LEDGER (BCA, Mandiri, etc.) ---
  // No changes requested to bank logic, keeping current robust implementation
  const bankSheets = ['BCA', 'Mandiri', 'BRI', 'BTN', 'Cash IDR', 'Non CB'];
  for (const sheetName of bankSheets) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const startRow = data.findIndex(row => row && row[0] && (typeof row[0] === 'number' && row[0] > 40000));
    if (startRow === -1) continue;

    const txs = [];
    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (isRowEmpty(row)) break; 
      
      const desc = String(row[1] || '').toUpperCase();
      if (desc.includes('TOTAL') || desc.includes('SALDO AKHIR')) continue;

      txs.push({
        date: typeof row[0] === 'number' ? excelDateToJSDate(row[0]) : new Date(),
        description: String(row[1] || ''),
        withdrawal: cleanCurrency(row[2]),
        deposit: cleanCurrency(row[3]),
        // Column E to L (Index 4 to 11) - Handle numeric ledger codes cleanly
        ledger: typeof row[4] === 'number' ? row[4].toFixed(2) : String(row[4] || ''),
        subLedger1: String(row[5] || ''),
        subLedger2: String(row[6] || ''),
        subLedger3: String(row[7] || ''),
        colI: String(row[8] || ''),
        colJ: String(row[9] || ''),
        colK: String(row[10] || ''),
        colL: String(row[11] || ''),
        balance: cleanCurrency(row[12]), 
        source: sheetName.toUpperCase().replace(/\s+/g, '_'),
      });
    }
    for (let i = 0; i < txs.length; i++) {
        try {
            await prisma.financialTransaction.create({ data: txs[i] });
        } catch (e: any) {
            console.error(`❌ CRITICAL_ERROR at ${sheetName}, index ${i}:`, JSON.stringify(txs[i], (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
            console.error(e);
            throw e;
        }
    }
    console.log(`✅ Seeded ${txs.length} transactions from ${sheetName}`);
  }

  // --- 2. SALES SHEET (limit AC = 29) ---
  const salesSheet = workbook.Sheets['Sales'];
  if (salesSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(salesSheet, { header: 1 });
    const headers = discoverHeaders(rows, [3], 29); // Row 4 (index 3) is header
    const sales = [];
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (isRowEmpty(row)) break; 
      sales.push({
        no: String(row[0] || ''),
        date: String(row[1] || ''),
        year: parseInt(String(row[2] || '0')),
        billingTo: String(row[3] || ''),
        project: String(row[4] || ''),
        description: String(row[5] || ''),
        basicPrice: cleanCurrency(row[6]),
        managementFee: cleanCurrency(row[7]),
        ppn: cleanCurrency(row[8]),
        totalAmount: cleanCurrency(row[9]),
        col11: String(row[10] || ''),
        bca: cleanCurrency(row[11]),
        mandiri: cleanCurrency(row[12]),
        danamon: cleanCurrency(row[13]),
        bri: cleanCurrency(row[14]),
        btn: cleanCurrency(row[15]),
        cashIdr: cleanCurrency(row[16]),
        nonCb: cleanCurrency(row[17]),
        outstanding: cleanCurrency(row[18]),
        unknown20: String(row[19] || ''),
        pph23: cleanCurrency(row[20]),
        apPph23: cleanCurrency(row[21]),
        ppnTax: cleanCurrency(row[22]),
        apPpn: cleanCurrency(row[23]),
        netReceived: cleanCurrency(row[24]), // Fixed mapping to Column Z (index 25)
        col27: String(row[26] || ''),
        col28: String(row[27] || ''),
        col29: String(row[28] || ''),
      });
    }
    await prisma.salesRecord.createMany({ data: sales });
    console.log(`✅ Seeded ${sales.length} rows from Sales (29 cols)`);
  }

  // --- 3. P&L SHEET (limit O = 15) ---
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

      const label = String(row[1] || '').trim();
      
      // Mode Switching
      if (label === 'C O G S') { mode = 'COGS'; continue; }
      if (label === 'EXPENSES') { mode = 'EXPENSE'; continue; }
      if (label === 'Total Expense') { mode = 'SUMMARY'; } // Start summary processing

      if (mode === 'SALES' && row[0]) {
        sales.push({
          no: parseInt(String(row[0])),
          accountName: label,
          gross: cleanCurrency(row[2]),
          vat: cleanCurrency(row[3]),
          apVat: cleanCurrency(row[4]),
          creditNote: cleanCurrency(row[5]),
          apCreditNote: cleanCurrency(row[6]),
          netSales: cleanCurrency(row[10]),
        });
      } else if (mode === 'COGS' && row[0]) {
        costs.push({
          no: parseInt(String(row[0])),
          accountName: label,
          category: 'COGS',
          bca: cleanCurrency(row[2]),
          mandiri: cleanCurrency(row[3]),
          bri: cleanCurrency(row[4]),
          btn: cleanCurrency(row[5]),
          cashIdr: cleanCurrency(row[6]),
          nonCb: cleanCurrency(row[7]),
          other: cleanCurrency(row[8]),
          total: cleanCurrency(row[10]),
        });
      } else if (mode === 'EXPENSE') {
        if (!row[0] && label && !label.includes('Total')) {
          currentSubCategory = label;
          continue;
        }
        if (label && !label.includes('Total')) {
          costs.push({
            no: parseInt(String(row[0] || '0')),
            accountName: label,
            category: 'EXPENSE',
            subCategory: currentSubCategory,
            bca: cleanCurrency(row[2]),
            mandiri: cleanCurrency(row[3]),
            bri: cleanCurrency(row[4]),
            btn: cleanCurrency(row[5]),
            cashIdr: cleanCurrency(row[6]),
            nonCb: cleanCurrency(row[7]),
            other: cleanCurrency(row[8]),
            total: cleanCurrency(row[10]),
          });
        }
      } else if (mode === 'SUMMARY') {
        if (['Total Expense', 'OPERATING PROFIT', 'Depreciation', 'PROFIT BEFORE TAX', 'Income Tax', 'PROFIT AFTER TAX'].includes(label)) {
          summaries.push({
            label,
            bca: cleanCurrency(row[2]),
            mandiri: cleanCurrency(row[3]),
            bri: cleanCurrency(row[4]),
            btn: cleanCurrency(row[5]),
            cashIdr: cleanCurrency(row[6]),
            nonCb: cleanCurrency(row[7]),
            other: cleanCurrency(row[8]),
            total: cleanCurrency(row[10]),
          });
        }
      }
    }
    await prisma.profitLossSales.createMany({ data: sales });
    await prisma.profitLossCost.createMany({ data: costs });
    await prisma.profitLossSummary.createMany({ data: summaries });
    console.log(`✅ Seeded PL: ${sales.length} Sales, ${costs.length} Costs, ${summaries.length} Summaries`);
  }

  // --- 4. AR SHEET (limit W = 23) ---
  const arSheet = workbook.Sheets['AR'];
  if (arSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(arSheet, { header: 1 });
    const ar = [];
    let currentArType = '';
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (isRowEmpty(row)) continue; // Don't break on empty rows, just continue
      
      const typeLabel = String(row[1] || '').trim();
      if (typeLabel && typeLabel !== 'Age') { // 'Age' check just in case headers repeat
        currentArType = typeLabel;
      }

      // Skip rows that don't have an entity name at index 3 (Column D)
      const entityName = String(row[3] || '').trim();
      if (!entityName) continue;

      ar.push({
        col0: String(row[0] || '').trim(), // Column A
        arType: currentArType,             // Column B
        subCategory: String(row[2] || ''), // Column C
        entityName: entityName,           // Column D
        description: String(row[4] || ''), // Column E
        idr: cleanCurrency(row[5]),
        usd: cleanCurrency(row[6]),
        rate: cleanCurrency(row[7]),
        col8: String(row[8] || '').trim(), // Index 8 Gap
        bca: cleanCurrency(row[9]),
        mandiri: cleanCurrency(row[10]),
        bri: cleanCurrency(row[11]),
        cashIdr: cleanCurrency(row[12]),
        nonCb: cleanCurrency(row[13]),
        citibank: cleanCurrency(row[14]),
        cashUsd: cleanCurrency(row[15]),
        col16: String(row[16] || '').trim(), // Index 16 Gap
        outstandingIdr: cleanCurrency(row[17]),
        outstandingUsd: cleanCurrency(row[18]),
        col19: String(row[19] || '').trim(), // Index 19 Gap
        adjustmentIdr: cleanCurrency(row[20]),
        adjustmentUsd: cleanCurrency(row[21]),
      });
    }
    try {
      await prisma.accountReceivable.createMany({ data: ar });
      console.log(`✅ Seeded ${ar.length} rows from AR (23 cols)`);
    } catch (e: any) {
      console.error(`❌ ERROR at AccountReceivable seeding:`, e);
      throw e;
    }
  }

  // --- 5. AP SHEET (limit X = 24) ---
  const apSheet = workbook.Sheets['AP ']; // Noted the trailing space in research
  if (apSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(apSheet, { header: 1 });
    const ap = [];
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (isRowEmpty(row)) continue; // Don't break on empty, just continue
      ap.push({
        payable: String(row[0] || ''),
        year: String(row[1] || ''),
        vendor: String(row[2] || ''),
        keterangan: String(row[3] || ''),
        idr: cleanCurrency(row[4]),
        usd: cleanCurrency(row[5]),
        rate: cleanCurrency(row[6]),
        costCategory: String(row[7] || ''),
        projectRef: String(row[8] || ''),
        col9: String(row[9] || '').trim(),
        bca: cleanCurrency(row[10]),
        mandiri: cleanCurrency(row[11]),
        btn: cleanCurrency(row[12]),
        bri: cleanCurrency(row[13]),
        cashIdr: cleanCurrency(row[14]),
        nonCb: cleanCurrency(row[15]),
        citibank: cleanCurrency(row[16]),
        cashUsd: cleanCurrency(row[17]),
        col18: String(row[18] || '').trim(),
        outstandingIdr: cleanCurrency(row[19]),
        outstandingUsd: cleanCurrency(row[20]),
        col21: String(row[21] || '').trim(),
        notesYogi: String(row[22] || ''),
        koreksiSelisih: String(row[23] || ''),
      });
    }
    await prisma.accountPayable.createMany({ data: ap });
    console.log(`✅ Seeded ${ap.length} rows from AP (24 cols)`);
  }

  // --- 6. DEPRECIATION SHEET (limit U = 21) ---
  const deprecSheet = workbook.Sheets['Deprec 2021'];
  if (deprecSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(deprecSheet, { header: 1 });
    const deprec = [];
    for (let i = 5; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[2]) continue; // Asset name is required
      deprec.push({
        purchaseDate: String(row[0] || ''),
        bankRef: String(row[1] || ''),
        assetName: String(row[2]),
        purchasePrice: cleanCurrency(row[3]),
        usefulLifeMonths: parseInt(String(row[4] || '0')) || 0,
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
    await prisma.assetDepreciation.createMany({ data: deprec });
    console.log(`✅ Seeded ${deprec.length} assets from Deprec 2021 (21 cols)`);
  }


  // --- 7. BALANCE SHEET (limit H = 8) ---
  const balanceSheet = workbook.Sheets['Balance Sheet 2021'];
  if (balanceSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(balanceSheet, { header: 1 });
    const balance = [];
    for (let i = 5; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;
      balance.push({
        accountName: String(row[0]),
        idr: cleanCurrency(row[1]),
        usd: cleanCurrency(row[2]),
        rate: cleanCurrency(row[3]),
        col5: String(row[4] || ''),
        col6: String(row[5] || ''),
        col7: String(row[6] || ''),
        col8: String(row[7] || ''),
      });
    }
    await prisma.balanceSheetItem.createMany({ data: balance });
    console.log(`✅ Seeded ${balance.length} items from Balance Sheet (8 cols)`);
  }

  // --- 8. INTER ACCOUNTS (limit I = 9) ---
  const interSheet = workbook.Sheets['Inter Accounts'];
  if (interSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(interSheet, { header: 1 });
    const transfers = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (isRowEmpty(row)) break; 
      transfers.push({
        description: String(row[0]),
        bca: cleanCurrency(row[1]),
        mandiri: cleanCurrency(row[2]),
        bri: cleanCurrency(row[3]),
        btn: cleanCurrency(row[4]),
        cashIdr: cleanCurrency(row[5]),
        nonCashBank: cleanCurrency(row[6]),
        checker: cleanCurrency(row[7]),
      });
    }
    await prisma.interAccountTransfer.createMany({ data: transfers });
    console.log(`✅ Seeded ${transfers.length} transfers from Inter Accounts (9 cols)`);
  }

  console.log('🏁 Financial Data Ingestion Overhaul Complete!');
}

