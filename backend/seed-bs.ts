
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Balance Sheet data...');
  
  // Clear existing items
  await prisma.balanceSheetItem.deleteMany();

  const items = [
    // ASSETS
    { category: 'Cash', accountName: 'Cash IDR', idr: 65000000, accountNo: '1101' },
    { category: 'Cash', accountName: 'Cash Other Currency', idr: 0, accountNo: '1102' },
    
    { category: 'Bank Accounts', accountName: 'Mandiri IDR - 122-00-0487556-6', idr: 15700000, accountNo: '1202' },
    { category: 'Bank Accounts', accountName: 'BCA IDR - 575-048-9666', idr: 258100000, accountNo: '1203' },
    { category: 'Bank Accounts', accountName: 'BRI', idr: 613500000, accountNo: '1207' },
    { category: 'Bank Accounts', accountName: 'BTN', idr: 38700000, accountNo: '1208' },
    
    { category: 'Deposit', accountName: 'Deposit to vendor', idr: 478900000, accountNo: '1301' },
    
    { category: 'Account Receivable', accountName: 'AR Cash Advance', idr: 4260000000, accountNo: '1401' },
    { category: 'Account Receivable', accountName: 'AR Trade', idr: 7680000000, accountNo: '1405' },
    
    { category: 'Prepaid Tax', accountName: 'PPN', idr: 23800000, accountNo: '1502' },
    
    { category: 'Fixed Assets', accountName: 'Office Equipment', idr: 638500000, accountNo: '1601' },
    { category: 'Fixed Assets', accountName: 'Vehicle', idr: 2280000000, accountNo: '1602' },
    { category: 'Fixed Assets', accountName: 'Intangible property', idr: -2890000000, accountNo: '1603' },

    // LIABILITIES
    { category: 'Account Payable', accountName: 'Trade Payable', idr: 1250000000, accountNo: '2101' },
    { category: 'Short Term Loan', accountName: 'Bank Loan', idr: 500000000, accountNo: '2201' },

    // EQUITY
    { category: 'Equity', accountName: 'Shared Capital', idr: 10000000000, accountNo: '3101' },
    { category: 'Equity', accountName: 'Retained Earnings', idr: 1500000000, accountNo: '3102' },
  ];

  for (const item of items) {
    await prisma.balanceSheetItem.create({
      data: item
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
