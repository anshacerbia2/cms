import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { 
  excelDateToJSDate, 
  cleanCurrency, 
  cleanString, 
  isRowEmpty 
} from './utils/excel';

export async function seedBanks(prisma: PrismaClient) {
  console.log('🏛️ Seeding banks master & internal accounts...');
  
  const banksCsvPath = path.join(__dirname, '..', 'seed-data', 'banks.csv');
  const bankIds: Record<string, bigint> = {};

  if (fs.existsSync(banksCsvPath)) {
    const csvContent = fs.readFileSync(banksCsvPath, 'utf8');
    const lines = csvContent.split('\n');
    const headerLine = lines[0].trim();
    if (!headerLine) {
       console.warn('⚠️ Banks CSV is empty, skipping.');
       return;
    }
    const header = headerLine.split(';');
    
    // Skip header and empty lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(';');
      if (columns.length !== header.length) continue;

      const data: any = {};
      header.forEach((h, index) => {
        data[h.trim()] = columns[index].trim();
      });

      // Normalize bank code (digits only, pad to 3)
      let bankCode = (data.bank_code || '').replace(/\D/g, '');
      if (!bankCode) continue;
      bankCode = bankCode.padStart(3, '0');

      const bank = await prisma.bank.upsert({
        where: { bankCode },
        update: {
          bankName: data.bank_name || null,
          bankAddress: data.bank_address || null,
          bankBrand: data.bank_brand || null,
        },
        create: {
          bankCode,
          bankName: data.bank_name || null,
          bankAddress: data.bank_address || null,
          bankBrand: data.bank_brand || null,
        },
      });

      if (data.bank_brand) {
        bankIds[data.bank_brand] = bank.id;
      }
    }
    console.log(`✅ Banks from CSV seeded.`);
  } else {
    console.warn('⚠️ Banks CSV not found at:', banksCsvPath);
  }

  // Seed sample Internal Accounts using the loaded bankIds
  const legacyAccounts = [
    { bankBrand: 'BCA', accountNo: '5750 489 666', branch: 'Sahardjo', holderName: 'RD Hidianitje', type: 'BANK', displayName: 'BCA Sahardjo', displayOrder: 1 },
    { bankBrand: 'BCA', accountNo: '5350 285 999', branch: 'Juanda', holderName: 'PT Panconvince Mitra International', type: 'BANK', displayName: 'BCA Juanda', displayOrder: 2 },
    { bankBrand: 'MANDIRI', accountNo: '122 000 487 5566', branch: 'Mid Plaza', holderName: 'PT Panconvince Mitra International', type: 'BANK', displayName: 'Mandiri Mid Plaza', displayOrder: 3 },
    { bankBrand: 'MANDIRI', accountNo: '', branch: 'PM', holderName: 'PT Panconvince Mitra International', type: 'BANK', displayName: 'Mandiri Plasa Mandiri', displayOrder: 4 },
    { bankBrand: 'BRI', accountNo: '1125 0100 0255 301', branch: 'Sahardjo', holderName: 'PT Panconvince Mitra International', type: 'BANK', displayName: 'BRI Sahardjo', displayOrder: 5 },
    { bankBrand: 'BRI', accountNo: '', branch: 'Tebet', holderName: 'PT Panconvince Mitra International', type: 'BANK', displayName: 'BRI Tebet', displayOrder: 6 },
    { bankBrand: 'BTN', accountNo: '00001 01 30 001293 5', branch: 'Sahardjo', holderName: 'PT Panconvince Mitra International', type: 'BANK', displayName: 'BTN', displayOrder: 7 },
    { bankBrand: 'BANK RAYA', accountNo: '001 001 001 907 409', branch: '', holderName: 'PT Panconvince Mitra International', type: 'BANK', displayName: 'Bank Raya', displayOrder: 8 },
    { bankBrand: 'BNI', accountNo: '', branch: '', holderName: 'PT Panconvince Mitra International', type: 'BANK', displayName: 'BNI', displayOrder: 9 },
    { accountNo: '', branch: '', holderName: 'Meery Ferdian', type: 'CASH', displayName: 'Cash IDR', displayOrder: 10 },
    { accountNo: '', branch: '', holderName: 'Non Cash & Bank', type: 'OTHER', displayName: 'Non CB', displayOrder: 11 },
    // Not a bank: the control account VAT is cleared through. Money moves into
    // it from BCA Juanda, Mandiri Mid Plaza and Non Cash & Bank, and the
    // payable side records the VAT position against it.
    { accountNo: '', branch: '', holderName: 'PPn In and Out', type: 'OTHER', displayName: 'PPn In and Out', displayOrder: 12 },
  ];

  for (const acc of legacyAccounts) {
    let bankId: bigint | null = null;
    
    // Only attempt to find a bankId if the account type is 'BANK'
    if (acc.type === 'BANK' && (acc as any).bankBrand) {
      bankId = bankIds[(acc as any).bankBrand] || null;
      
      if (!bankId) {
        console.warn(`⚠️ Skipping internal account ${acc.accountNo} - Bank brand "${(acc as any).bankBrand}" not found in master.`);
        continue;
      }
    }

    // Exclude bankBrand (if present) from the data sent to Prisma
    const { bankBrand, ...accData } = acc as any;
    
    await prisma.internalAccount.upsert({
      where: { 
        accountNo_type_holderName_branch: {
          accountNo: accData.accountNo || "",
          type: accData.type,
          holderName: accData.holderName,
          branch: accData.branch || ""
        }
      },
      update: {
        ...accData,
        bankId: bankId
      },
      create: { 
        ...accData, 
        bankId: bankId 
      },
    });
  }
  
  console.log('✅ Internal accounts seeding completed.');
}

/** The fiscal year this seeder owns. Later years have their own seeders. */
const TAG_YEAR = 2025;

const FISCAL_OPENINGS_2025: Record<string, number> = {
  'BCA Sho': 39994324.36,
  'BCA Juanda': 1927869846.48,
  'Mandiri MP': 1858077450.77,
  'Mandiri PM': 0,
  'BRI Sho': 339393737.33,
  'BRI Tebet': 5492093,
  'BTN': 3286023161.35,
  'Raya': 3556331.49,
  'BNI': 0,
  'Cash IDR': 346869,
  'Non CB': 0,
};

export const SHEET_TO_ACCOUNT: Record<string, any> = {
  'BCA Sho': { type: 'BANK', branch: 'Sahardjo', holderName: 'RD Hidianitje', accountNo: '5750 489 666' },
  'BCA Juanda': { type: 'BANK', branch: 'Juanda', holderName: 'PT Panconvince Mitra International', accountNo: '5350 285 999' },
  'Mandiri MP': { type: 'BANK', branch: 'Mid Plaza', holderName: 'PT Panconvince Mitra International', accountNo: '122 000 487 5566' },
  'Mandiri PM': { type: 'BANK', branch: 'PM', holderName: 'PT Panconvince Mitra International', accountNo: '' },
  'BRI Sho': { type: 'BANK', branch: 'Sahardjo', holderName: 'PT Panconvince Mitra International', accountNo: '1125 0100 0255 301' },
  'BRI Tebet': { type: 'BANK', branch: 'Tebet', holderName: 'PT Panconvince Mitra International', accountNo: '' },
  'BTN': { type: 'BANK', branch: 'Sahardjo', holderName: 'PT Panconvince Mitra International', accountNo: '00001 01 30 001293 5' },
  'Raya': { type: 'BANK', branch: '', holderName: 'PT Panconvince Mitra International', accountNo: '001 001 001 907 409' },
  'BNI': { type: 'BANK', branch: '', holderName: 'PT Panconvince Mitra International', accountNo: '' },
  'Cash IDR': { type: 'CASH', branch: '', holderName: 'Meery Ferdian', accountNo: '' },
  'Non CB': { type: 'OTHER', branch: '', holderName: 'Non Cash & Bank', accountNo: '' },
  'PPn In and Out': { type: 'OTHER', branch: '', holderName: 'PPn In and Out', accountNo: '' },
};

export async function seedBankMutation(prisma: PrismaClient, workbook?: XLSX.WorkBook) {
  console.log('🏛️ Seeding bank mutations (ledger)...');

  // Clear existing data to prevent duplicates. Scoped to this seeder's own
  // fiscal year, because later years are loaded by their own seeders and an
  // unscoped delete here would wipe them.
  await prisma.financialTransaction.deleteMany({ where: { tagYear: TAG_YEAR } });
  await prisma.fiscalPeriod.deleteMany({ where: { year: TAG_YEAR } });
  // If no workbook provided, load it manually from the default path
  let wb = workbook;
  if (!wb) {
    const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'bank-mutation.xlsx');
    if (fs.existsSync(filePath)) {
      wb = XLSX.readFile(filePath);
    } else {
      console.warn('⚠️ Financial report Excel not found at:', filePath);
      return;
    }
  }

  const bankSheets = ['BCA Sho', 'BCA Juanda', 'Mandiri MP', 'Mandiri PM', 'BRI Sho', 'BRI Tebet', 'BTN', 'BNI', 'Raya', 'Cash IDR', 'Non CB'];

  console.log('📄 Stage 1: Creating initial transactions...');
  for (const sheetName of bankSheets) {
    let startDate = new Date('2024-01-01');
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    // Find Internal Account
    const mapping = SHEET_TO_ACCOUNT[sheetName];
    let internalAccount = null;
    if (mapping) {
      internalAccount = await prisma.internalAccount.findUnique({
        where: {
          accountNo_type_holderName_branch: {
            accountNo: mapping.accountNo || "",
            type: mapping.type,
            holderName: mapping.holderName,
            branch: mapping.branch || ""
          }
        }
      });
    }

    if (!internalAccount) {
      console.warn(`⚠️ Internal account not found for ${sheetName}, skipping stage 1.`);
      continue;
    }

    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const txsToCreate = [];

    // Assuming headers are at the top, data starts from index 4
    for (let i = 4; i < data.length; i++) {
      const row = data[i];
      if (isRowEmpty(row)) break;

      const rowDate = excelDateToJSDate(row[0]);
      if (rowDate) {
        startDate = rowDate;
      }

      txsToCreate.push({
        internalAccountId: internalAccount.id,
        colA: new Date(startDate),
        colB: cleanString(row[1]),
        colC: cleanCurrency(row[2]), 
        colD: cleanCurrency(row[3]), 
        colE: null, // Let Stage 2 calculate this manually
        colF: cleanString(row[5]),
        colG: cleanString(row[6]),
        colH: cleanString(row[7]),
        colI: cleanString(row[8]),
        tagYear: TAG_YEAR,
      });
    }

    if (txsToCreate.length > 0) {
      await prisma.financialTransaction.createMany({ data: txsToCreate });
      console.log(`✅ Stage 1: Created ${txsToCreate.length} rows for ${sheetName}`);
    }
  }

  console.log('📈 Stage 2: Manually calculating balances & fiscal periods...');
  for (const sheetName of bankSheets) {
    const mapping = SHEET_TO_ACCOUNT[sheetName];
    let internalAccount = null;
    if (mapping) {
      internalAccount = await prisma.internalAccount.findUnique({
        where: {
          accountNo_type_holderName_branch: {
            accountNo: mapping.accountNo || "",
            type: mapping.type,
            holderName: mapping.holderName,
            branch: mapping.branch || ""
          }
        }
      });
    }

    if (!internalAccount) continue;

    // Get ALL transactions for this account, ordered by date and ID
    const dbTxs = await prisma.financialTransaction.findMany({
      where: { internalAccountId: internalAccount.id },
      orderBy: [{ colA: 'asc' }, { id: 'asc' }]
    });

    if (dbTxs.length === 0) continue;

    const years = [...new Set(dbTxs.map(tx => tx.colA?.getUTCFullYear()))].filter(Boolean) as number[];
    years.sort((a, b) => a - b);
    
    let runningBalanceAcrossYears: number | null = null;

    /* --- LEGACY BLOCK START ---
    for (const year of years) {
      const yearTxs = dbTxs.filter(tx => tx.colA?.getUTCFullYear() === year);
      
      // Look up the raw balance from Excel for the VERY FIRST transaction of this account to seed the opening
      // We need to re-read the sheet to get the original Excel balance for the first row of this year
      let openingBalance = 0;
      
      if (runningBalanceAcrossYears !== null) {
        openingBalance = runningBalanceAcrossYears;
      } else {
        // Initial opening balance: use the first transaction's hardcoded start or derive from Excel
        // For simplicity and accuracy, we'll use the hardcoded openings if 2025, or derive.
        if (year === 2025 && FISCAL_OPENINGS_2025[sheetName] !== undefined) {
           openingBalance = FISCAL_OPENINGS_2025[sheetName];
        } else if (sheetName === "Non CB" && year === 2024) {
           // For 2024, default to 0 unless we have a specific opening map
           openingBalance = 0; 
        }
      }

      let runningBalance = openingBalance;

      // Upsert Fiscal Period
      const fiscal = await prisma.fiscalPeriod.upsert({
        where: { internalAccountId_year: { internalAccountId: internalAccount.id, year } },
        update: { openingBalance, status: 'OPEN' },
        create: { internalAccountId: internalAccount.id, year, openingBalance, status: 'OPEN' }
      });

      // MANUALLY CALCULATE EACH ROW
      for (const tx of yearTxs) {
        runningBalance = runningBalance + (Number(tx.colD) || 0) - (Number(tx.colC) || 0);
        await prisma.financialTransaction.update({
          where: { id: tx.id },
          data: { colE: new Prisma.Decimal(runningBalance) }
        });
      }
      
      runningBalanceAcrossYears = runningBalance;

      // Close Fiscal with final calculated balance
      await prisma.fiscalPeriod.update({
        where: { id: fiscal.id },
        data: { closingBalance: new Prisma.Decimal(runningBalance), status: 'CLOSED' }
      });

      console.log(`✅ Stage 2: ${sheetName} ${year} Manual Calc. Opening: ${openingBalance}, Closing: ${runningBalance}`);
    }
    --- LEGACY BLOCK END --- */

    // NEW LOGIC: Force all transactions from the Excel sheet into fiscal year 2025
    const forcedYear = TAG_YEAR;
    let openingBalance = FISCAL_OPENINGS_2025[sheetName] !== undefined ? FISCAL_OPENINGS_2025[sheetName] : 0;
    
    // Upsert Fiscal Period for 2025
    const fiscal = await prisma.fiscalPeriod.upsert({
      where: { internalAccountId_year: { internalAccountId: internalAccount.id, year: forcedYear } },
      update: { openingBalance, status: 'OPEN' },
      create: { internalAccountId: internalAccount.id, year: forcedYear, openingBalance, status: 'OPEN' }
    });

    let runningBalance = openingBalance;

    // MANUALLY CALCULATE EACH ROW (Treating all dbTxs as part of 2025)
    for (const tx of dbTxs) {
      runningBalance = runningBalance + (Number(tx.colD) || 0) - (Number(tx.colC) || 0);
      await prisma.financialTransaction.update({
        where: { id: tx.id },
        data: { colE: new Prisma.Decimal(runningBalance) }
      });
    }

    // Close Fiscal with final calculated balance
    await prisma.fiscalPeriod.update({
      where: { id: fiscal.id },
      data: { closingBalance: new Prisma.Decimal(runningBalance), status: 'CLOSED' }
    });

    console.log(`✅ Stage 2: ${sheetName} ${forcedYear} Manual Calc. Opening: ${openingBalance}, Closing: ${runningBalance}`);
  }
}
