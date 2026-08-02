import { PrismaClient } from '@prisma/client';

export async function seedEquity(prisma: PrismaClient) {
  console.log('🌱 Seeding Equity Properties (2025 & 2026 parity)...');

  const equityData = [
    // --- YEAR 2025 ---
    { year: 2025, key: 'SHARED_CAPITAL', value: 2500000000 },
    { year: 2025, key: 'RE_PREV_YEARS', value: 6204867304.01 },
    { year: 2025, key: 'DIVIDENDS', value: null },
    { year: 2025, key: 'PL_NET_PROFIT', value: null },

    // // --- YEAR 2026 (Same as 2025) ---
    // { year: 2026, key: 'SHARED_CAPITAL', value: 2500000000 },
    // { year: 2026, key: 'RE_PREV_YEARS', value: 8453697304.01 },
    // { year: 2026, key: 'DIVIDENDS', value: -660000000 },
    // { year: 2026, key: 'PL_NET_PROFIT', value: 3849807654.92 },
  ];

  for (const item of equityData) {
    await prisma.equityProperty.upsert({
      where: {
        year_key: {
          year: item.year,
          key: item.key,
        },
      },
      update: {
        value: item.value,
      },
      create: {
        year: item.year,
        key: item.key,
        value: item.value,
      },
    });
  }

  console.log('✅ Equity Properties Seeded (2025 & 2026 parity)!');
}
