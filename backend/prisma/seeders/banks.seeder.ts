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

