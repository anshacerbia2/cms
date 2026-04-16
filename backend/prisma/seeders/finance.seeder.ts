import * as XLSX from 'xlsx';
import path from 'path';

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
function cleanCurrency(val: any): number {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return 0;
  const cleaned = val.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

export async function seedFinance(prisma: any) {
  console.log('🚀 Hardening Financial Data Ingestion...');
  const filePath = path.resolve('prisma/seed-data/financial-report.xlsx');
  const workbook = XLSX.readFile(filePath);

  // 0. Clean Slate
  console.log('🗑️ Clearing old financial data...');
  await prisma.financialTransaction.deleteMany({});
  await prisma.salesRecord.deleteMany({});
  await prisma.accountReceivable.deleteMany({});
  await prisma.accountPayable.deleteMany({});
  await prisma.assetDepreciation.deleteMany({});
  await prisma.profitLossSales.deleteMany({});
  await prisma.profitLossCost.deleteMany({});
  await prisma.balanceSheetItem.deleteMany({});
  await prisma.interAccountTransfer.deleteMany({});

  // 1. Consolidated Bank Transactions (Unified Mapping: 0=Date, 2=Out, 3=In, 4=Balance)
  const bankSheets = ['BCA', 'Mandiri', 'BRI', 'BTN', 'Cash IDR', 'Non CB'];
  for (const sheetName of bankSheets) {
    try {
      console.log(`--- Processing Bank: ${sheetName} ---`);
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        console.warn(`⚠️ Sheet ${sheetName} missing.`);
        continue;
      }

      const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      // Determine Start Row Dynamically
      const startRow = data.findIndex(row => row && row[0] && (typeof row[0] === 'number' && row[0] > 40000));
      if (startRow === -1) {
        console.warn(`⚠️ No data rows found in ${sheetName}.`);
        continue;
      }

      const transactionsData = [];
      let lastValidDate = new Date();

      // Explicitly capture Opening Balance from Row 3 (Excel row 4) if it exists
      const row3 = data[3];
      if (row3 && String(row3[1] || '').includes('Saldo Akhir Tahun')) {
        console.log(`🏦 Found Opening Balance in ${sheetName}: ${row3[1]}`);
        transactionsData.push({
          date: new Date('2020-12-31'),
          description: String(row3[1]),
          withdrawal: 0,
          deposit: 0,
          balance: cleanCurrency(row3[4]),
          source: sheetName.toUpperCase().replace(/\s+/g, '_'),
        });
      }

      for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;

        const rawDate = row[0];
        const rawDesc = String(row[1] || '').trim();
        
        // --- THE ULTIMATE BREAK GUARD (Applied to ALL sheets) ---
        // 1. If no description -> we are out.
        // 2. If no date AND (has withdrawal or deposit) -> it's a Total/Summary footer.
        const isFooter = !rawDate && (cleanCurrency(row[2]) !== 0 || cleanCurrency(row[3]) !== 0);
        
        if (!rawDesc || isFooter) {
          console.log(`🛑 [${sheetName}] Ending ingestion at row ${i}. Reason: ${!rawDesc ? 'No Description' : 'Footer/Total detected'}`);
          break;
        }

        // Date Carry Down Logic
        let currentDate = lastValidDate;
        if (rawDate && typeof rawDate === 'number' && rawDate > 40000) {
          currentDate = excelDateToJSDate(rawDate);
          lastValidDate = currentDate;
        }

        // Apply User Mapping: 0: Date, 2: Out, 3: In, 4: Balance
        transactionsData.push({
          date: currentDate,
          description: rawDesc,
          withdrawal: cleanCurrency(row[2]),
          deposit: cleanCurrency(row[3]),
          balance: cleanCurrency(row[4]),
          source: sheetName.toUpperCase().replace(/\s+/g, '_'),
        });
      }

      if (transactionsData.length > 0) {
        await prisma.financialTransaction.createMany({ data: transactionsData, skipDuplicates: true });
        console.log(`✅ Seeded ${transactionsData.length} records from ${sheetName}`);
      }
    } catch (e) {
      console.error(`❌ ${sheetName} failure:`, e);
    }
  }

  // 2. Sales — Sheet "Sales", header row 3, data from row 4
  try {
    const sheet = workbook.Sheets['Sales'];
    if (sheet) {
      const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const salesData = data.slice(4)
        .filter(row => row[3] && String(row[3]).trim() !== '' && typeof row[6] === 'number')
        .map(row => ({
          no: String(row[0] ?? ''),
          date: String(row[1] || ''),
          year: Number(row[2]) || null,
          billingTo: String(row[3] || ''),
          project: String(row[4] || ''),
          description: String(row[5] || ''),
          basicPrice: cleanCurrency(row[6]),
          managementFee: cleanCurrency(row[7]),
          ppn: cleanCurrency(row[8]),
          totalAmount: cleanCurrency(row[9]),
          bca: cleanCurrency(row[11]),
          mandiri: cleanCurrency(row[12]),
          danamon: cleanCurrency(row[13]),
          bri: cleanCurrency(row[14]),
          btn: cleanCurrency(row[15]),
          cashIdr: cleanCurrency(row[16]),
          nonCb: cleanCurrency(row[17]),
          outstanding: cleanCurrency(row[18]),
          pph23: cleanCurrency(row[20]),
          apPph23: cleanCurrency(row[21]),
          ppnTax: cleanCurrency(row[22]),
          apPpn: cleanCurrency(row[23]),
          netReceived: cleanCurrency(row[25]),
        }));
      if (salesData.length > 0) {
        await prisma.salesRecord.createMany({ data: salesData, skipDuplicates: true });
        console.log(`✅ Seeded ${salesData.length} Sales records.`);
      }
    }
  } catch (e) { console.error('❌ Sales failure:', e); }

  // 3. AR — Sheet "AR", multi-row header rows 2-3, data from row 4
  try {
    const sheet = workbook.Sheets['AR'];
    if (sheet) {
      const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const records = data.slice(4).filter(row => row[1] || row[3] || row[4]);
      const arData = records.map(row => ({
        arType: String(row[1] || ''),
        subCategory: String(row[2] || ''),
        entityName: String(row[3] || ''),
        description: String(row[4] || ''),
        endOf2020Idr: cleanCurrency(row[5]),
        endOf2020Usd: cleanCurrency(row[6]),
        rate: cleanCurrency(row[7]),
        bca: cleanCurrency(row[9]),
        mandiri: cleanCurrency(row[10]),
        bri: cleanCurrency(row[11]),
        cashIdr: cleanCurrency(row[12]),
        nonCb: cleanCurrency(row[13]),
        citibank: cleanCurrency(row[14]),
        cashUsd: cleanCurrency(row[15]),
        outstandingIdr: cleanCurrency(row[17]),
        outstandingUsd: cleanCurrency(row[18]),
        adjustmentIdr: cleanCurrency(row[20]),
        adjustmentUsd: cleanCurrency(row[21]),
      }));
      await prisma.accountReceivable.createMany({ data: arData, skipDuplicates: true });
      console.log(`✅ Seeded ${arData.length} AR records.`);
    }
  } catch (e) { console.error('❌ AR failure:', e); }

  // 4. AP — Sheet "AP " (with trailing space), header row 2, data from row 3
  try {
    const sheetName = workbook.SheetNames.find(s => s.trim() === 'AP');
    if (sheetName) {
      const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
      const apData = data.slice(3).filter(row => row[0]).map(row => ({
        payable: String(row[0] || ''),
        year: String(row[1] || ''),
        vendor: String(row[2] || ''),
        keterangan: String(row[3] || ''),
        idr: cleanCurrency(row[4]),
        usd: cleanCurrency(row[5]),
        rate: cleanCurrency(row[6]),
        costCategory: String(row[7] || ''),
        projectRef: String(row[8] || ''),
        bca: cleanCurrency(row[10]),
        mandiri: cleanCurrency(row[11]),
        btn: cleanCurrency(row[12]),
        bri: cleanCurrency(row[13]),
        cashIdr: cleanCurrency(row[14]),
        nonCb: cleanCurrency(row[15]),
        citibank: cleanCurrency(row[16]),
        cashUsd: cleanCurrency(row[17]),
        outstandingIdr: cleanCurrency(row[19]),
        outstandingUsd: cleanCurrency(row[20]),
        notesYogi: String(row[22] || ''),
        koreksiSelisih: String(row[23] || ''),
      }));
      await prisma.accountPayable.createMany({ data: apData, skipDuplicates: true });
      console.log(`✅ Seeded ${apData.length} AP records.`);
    }
  } catch (e) { console.error('❌ AP failure:', e); }

  // 5. Assets / Deprec 2021 — Sheet "Deprec 2021", header row 1, data from row 4
  try {
    const sheet = workbook.Sheets['Deprec 2021'];
    if (sheet) {
      const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const assetsData = data.slice(4)
        .filter(row => row[2] && String(row[2]).trim() !== '')
        .map(row => ({
          purchaseDate: String(row[0] ?? ''),
          bankRef: String(row[1] || ''),
          assetName: String(row[2]),
          purchasePrice: cleanCurrency(row[3]),
          usefulLifeMonths: parseInt(row[4]) || 0,
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
        }));
      await prisma.assetDepreciation.createMany({ data: assetsData, skipDuplicates: true });
      console.log(`✅ Seeded ${assetsData.length} Asset records.`);
    }
  } catch (e) { console.error('❌ Assets failure:', e); }

  // 6. PL — Sheet "PL"
  try {
    const plSheet = workbook.Sheets['PL'];
    if (plSheet) {
      const data: any[] = XLSX.utils.sheet_to_json(plSheet, { header: 1 });
      
      // 6a. Sales section (starts row 6 / index 5, ends row 98 / index 97)
      const salesPLData = data.slice(5, 98)
        .filter(row => row[1] && String(row[1]).trim() !== '')
        .map(row => ({
          no: typeof row[0] === 'number' ? row[0] : null,
          accountName: String(row[1]),
          gross: cleanCurrency(row[2]),
          vat: cleanCurrency(row[3]),
          apVat: cleanCurrency(row[4]),
          creditNote: cleanCurrency(row[5]),
          apCreditNote: cleanCurrency(row[6]),
          netSales: cleanCurrency(row[10]),
        }));
      if (salesPLData.length > 0) {
        await prisma.profitLossSales.createMany({ data: salesPLData, skipDuplicates: true });
        console.log(`✅ Seeded ${salesPLData.length} P&L Sales records.`);
      }

      // 6b. COGS & Expenses section
      // COGS (starts row 102 / index 101, ends row 294 / index 293)
      const cogsPLData = data.slice(101, 294)
        .filter(row => row[1] && String(row[1]).trim() !== '' && typeof row[0] === 'number')
        .map(row => ({
          no: Number(row[0]),
          accountName: String(row[1]),
          category: 'COGS',
          bca: cleanCurrency(row[2]),
          mandiri: cleanCurrency(row[3]),
          bri: cleanCurrency(row[4]),
          btn: cleanCurrency(row[5]),
          cashIdr: cleanCurrency(row[6]),
          nonCb: cleanCurrency(row[7]),
          other: cleanCurrency(row[8]),
          total: cleanCurrency(row[10]),
        }));
      
      // Expenses (starts row 298 / index 297)
      const expensePLData = data.slice(297)
        .filter(row => row[1] && String(row[1]).trim() !== '' && (typeof row[0] === 'number' || String(row[1]).includes('Total')))
        .map(row => ({
          no: typeof row[0] === 'number' ? row[0] : null,
          accountName: String(row[1]),
          category: 'EXPENSE',
          bca: cleanCurrency(row[2]),
          mandiri: cleanCurrency(row[3]),
          bri: cleanCurrency(row[4]),
          btn: cleanCurrency(row[5]),
          cashIdr: cleanCurrency(row[6]),
          nonCb: cleanCurrency(row[7]),
          other: cleanCurrency(row[8]),
          total: cleanCurrency(row[10]),
        }));

      const combinedCostData = [...cogsPLData, ...expensePLData];
      if (combinedCostData.length > 0) {
        await prisma.profitLossCost.createMany({ data: combinedCostData, skipDuplicates: true });
        console.log(`✅ Seeded ${combinedCostData.length} P&L Cost records (COGS + Expenses).`);
      }
    }
  } catch (e) { console.error('❌ PL failure:', e); }

  // 7. Balance Sheet — Sheet "Balance Sheet 2021", header row 4, data from row 5
  try {
    const bsSheet = workbook.Sheets['Balance Sheet 2021'];
    if (bsSheet) {
      const data: any[] = XLSX.utils.sheet_to_json(bsSheet, { header: 1 });
      const bsData = data.slice(5)
        .filter(row => row[0] && String(row[0]).trim() !== '')
        .map(row => ({
          accountName: String(row[0]),
          idr: cleanCurrency(row[1]),
          usd: cleanCurrency(row[2]),
          totalIdr: cleanCurrency(row[3]),
        }));
      await prisma.balanceSheetItem.createMany({ data: bsData, skipDuplicates: true });
      console.log(`✅ Seeded ${bsData.length} Balance Sheet records.`);
    }
  } catch (e) { console.error('❌ Balance Sheet failure:', e); }

  // 8. Inter-Account Transfers — Sheet "Inter Accounts", header row 0, data from row 1
  try {
    const sheet = workbook.Sheets['Inter Accounts'];
    if (sheet) {
      const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const iaData = data.slice(1)
        .filter(row => row[0] && String(row[0]).trim() !== '')
        .map(row => ({
          description: String(row[0]),
          bca: cleanCurrency(row[1]),
          mandiri: cleanCurrency(row[2]),
          bri: cleanCurrency(row[3]),
          btn: cleanCurrency(row[4]),
          cashIdr: cleanCurrency(row[5]),
          nonCashBank: cleanCurrency(row[6]),
          checker: cleanCurrency(row[7]),
        }));
      await prisma.interAccountTransfer.createMany({ data: iaData, skipDuplicates: true });
      console.log(`✅ Seeded ${iaData.length} Inter-Account transfers.`);
    }
  } catch (e) { console.error('❌ IA failure:', e); }

  console.log('🏁 Financial Data Fidelity Hardening Completed!');
}

