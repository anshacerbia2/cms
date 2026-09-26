import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { 
  excelDateToJSDate, 
  cleanCurrency, 
  cleanString, 
  isRowEmpty 
} from '../utils/excel';

/**
 * Bank master and the eleven internal accounts - created when missing, never
 * changed once they exist.
 *
 * Finance edits these in the app: on prod BNI got its account number, Cash was
 * renamed Petty Cash, and the display order was rearranged. This seeder used
 * to upsert on (account no, type, holder, branch), so an edited account no
 * longer matched, a duplicate was created beside it, and every account that
 * did match had its edits overwritten. `seed:year` runs this every time, so
 * it has to be safe against a live database.
 *
 * An account is recognised by its display name, the same key the fiscal-year
 * seeders use to find the account for a sheet or column.
 */
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
    
    // Dua kode muncul dua kali di CSV (110, 494). Dulu upsert membuat baris
    // terakhir yang menang, dan begitulah isi prod (494 = BANK RAYA, nama baru
    // BRI Agroniaga), jadi yang dipakai tetap baris terakhir per kode.
    const rowsByCode = new Map<string, { data: any; brands: string[] }>();
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

      const brands = rowsByCode.get(bankCode)?.brands ?? [];
      if (data.bank_brand) brands.push(data.bank_brand);
      rowsByCode.set(bankCode, { data, brands });
    }

    let created = 0;
    for (const [bankCode, { data, brands }] of rowsByCode) {
      // Bank yang sudah ada tidak diubah - mungkin sudah disunting di aplikasi.
      let bank = await prisma.bank.findUnique({ where: { bankCode } });
      if (!bank) {
        bank = await prisma.bank.create({
          data: {
            bankCode,
            bankName: data.bank_name || null,
            bankAddress: data.bank_address || null,
            bankBrand: data.bank_brand || null,
          },
        });
        created++;
      }

      for (const brand of brands) bankIds[brand] = bank.id;
    }
    console.log(`✅ Banks from CSV: ${created} created, existing ones left as they are.`);
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
  ];

  let createdAccounts = 0;
  for (const acc of legacyAccounts) {
    const existing = await prisma.internalAccount.findFirst({
      where: { displayName: acc.displayName },
      select: { id: true },
    });
    if (existing) continue;

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
    
    await prisma.internalAccount.create({
      data: {
        ...accData,
        bankId: bankId
      },
    });
    createdAccounts++;
  }

  console.log(
    `✅ Internal accounts: ${createdAccounts} created, ` +
      `${legacyAccounts.length - createdAccounts} already there and left as they are.`,
  );
}

