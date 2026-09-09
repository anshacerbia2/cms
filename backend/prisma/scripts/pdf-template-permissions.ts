/**
 * Standalone entry point for the print template seeder.
 *
 * See prisma/scripts/sales-pipeline-permissions.ts for why production runs these
 * one at a time instead of `prisma db seed`.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedPdfTemplates } from '../seeders/pdf-templates.seeder';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

seedPdfTemplates(prisma)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
