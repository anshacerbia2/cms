import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedAuth } from './auth.seeder';
import { seedCustomers } from './customers.seeder';
import { seedSuppliers } from './suppliers.seeder';
import { seedProducts } from './products.seeder';
import { seedBankMutation, seedBanks } from './banks.seeder';
import { seedFinance } from './finance.seeder';
import { seedAccountReceivable } from './account-receivable.seeder';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting Modular CMS Seeding...');
  
  try {
    // Auth must come first
    await seedAuth(prisma);
    
    // Independent entities
    await seedCustomers(prisma);
    await seedSuppliers(prisma);
    await seedProducts(prisma);
    
    // Bank Master & Internal Accounts
    await seedBanks(prisma);
    await seedBankMutation(prisma);

    // Comprehensive Financial Data (from Excel)
    await seedFinance(prisma);
    await seedAccountReceivable(prisma);

    console.log('🚀 Seeding completed successfully.');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
