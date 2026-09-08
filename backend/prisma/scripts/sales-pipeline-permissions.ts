/**
 * Standalone entry point for the sales pipeline permission/menu seeder.
 *
 * `prisma db seed` runs the whole seeder chain, which wipes and rebuilds finance and
 * auth data — fine on a fresh local database, destructive against production. This
 * wrapper runs only the upsert-only sales pipeline step, so it is safe there:
 *
 *   npx tsx prisma/scripts/sales-pipeline-permissions.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedSalesPipelinePermissions } from '../seeders/sales-pipeline.seeder';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

seedSalesPipelinePermissions(prisma)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
