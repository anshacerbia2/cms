import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

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
    { bankBrand: 'BCA', accountNo: '5750 489 666', branch: 'Sahardjo', holderName: 'RD Hidianitje', type: 'Bank' },
    { bankBrand: 'MANDIRI', accountNo: '122 000 487 5566', branch: 'Mid Plaza', holderName: 'PT Pan Convince Mitra International', type: 'Bank' },
    { bankBrand: 'BRI', accountNo: '1125 0100 0255 301', branch: 'Sahardjo', holderName: 'PT Pan Convince Mitra International', type: 'Bank' },
  ];

  for (const acc of legacyAccounts) {
    const bankId = bankIds[acc.bankBrand];
    if (!bankId) {
        console.warn(`⚠️ Skipping internal account ${acc.accountNo} - Bank brand ${acc.bankBrand} not found.`);
        continue;
    }

    const { bankBrand, ...accData } = acc;
    await prisma.internalAccount.upsert({
      where: { id: BigInt(legacyAccounts.indexOf(acc) + 1) },
      update: {
        ...accData as any,
        bankId: bankId
      },
      create: { 
          ...accData as any, 
          bankId: bankId 
      },
    });
  }
  
  console.log('✅ Internal accounts seeding completed.');
}
