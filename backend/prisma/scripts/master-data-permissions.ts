/**
 * Standalone entry point for the master data permission seeder.
 *
 * See prisma/scripts/sales-pipeline-permissions.ts for why production runs these
 * one at a time instead of `prisma db seed`.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedMasterDataPermissions } from '../seeders/master-data.seeder';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

seedMasterDataPermissions(prisma)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
