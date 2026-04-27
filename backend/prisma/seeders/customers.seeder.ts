import { PrismaClient } from '@prisma/client';

export async function seedCustomers(prisma: PrismaClient) {
  console.log('👥 Seeding sample customers...');
  
  const customers = [
    {
      code: 'CST-20260413-SOLUS',
      name: 'PT. Solusi Maju Utama',
      bankName: 'BCA',
      bankAccountNumber: '1234567890',
      bankAccountName: 'PT SOLUSI MAJU UTAMA',
      status: 'ACTIVE',
      notes: 'High priority client for project delta.',
    },
    {
      code: 'CST-20260413-KARYA',
      name: 'CV. Karya Mandiri Sejahtera',
      bankName: 'Mandiri',
      bankAccountNumber: '0987654321',
      bankAccountName: 'KARYA MANDIRI SEJAHTERA',
      status: 'ACTIVE',
      notes: 'Regular maintenance client.',
    },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { code: c.code },
      update: {},
      create: c as any,
    });
  }
  
  console.log('✅ Customers seeding completed.');
}
