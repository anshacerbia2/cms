/**
 * Idempotent, upsert-only permission script for the sales pipeline modules.
 *
 * Deliberately separate from `prisma/seeders/auth.seeder.ts`: that seeder wipes
 * menus/role_menu before rebuilding them, which is unsafe against a live database.
 * This script only ever upserts — it never deletes.
 *
 *   npx tsx prisma/scripts/sales-pipeline-permissions.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const MODULES: { module: string; label: string }[] = [
  { module: 'projects', label: 'Project' },
  { module: 'proposals', label: 'Proposal' },
  { module: 'boqs', label: 'BoQ' },
  { module: 'sales-items', label: 'Sales Item' },
  { module: 'invoices', label: 'Invoice' },
  { module: 'receive-vouchers', label: 'Receive Voucher' },
  { module: 'payment-vouchers', label: 'Payment Voucher' },
];

const ACTIONS: { action: string; describe: (label: string) => string; readOnly: boolean }[] = [
  { action: 'index', describe: (l) => `View ${l}s`, readOnly: true },
  { action: 'show', describe: (l) => `Show ${l} Details`, readOnly: true },
  { action: 'create', describe: (l) => `Create ${l}`, readOnly: false },
  { action: 'update', describe: (l) => `Update ${l}`, readOnly: false },
  { action: 'delete', describe: (l) => `Delete ${l}`, readOnly: false },
];

async function main() {
  const [adminRole, viewerRole] = await Promise.all([
    prisma.role.findUnique({ where: { slug: 'admin' } }),
    prisma.role.findUnique({ where: { slug: 'viewer' } }),
  ]);

  if (!adminRole) throw new Error('Role "admin" not found — run the auth seeder first.');

  let created = 0;
  let linked = 0;

  for (const { module, label } of MODULES) {
    for (const { action, describe, readOnly } of ACTIONS) {
      const route = `${module}.${action}`;

      const existing = await prisma.permission.findUnique({ where: { route } });
      const permission = await prisma.permission.upsert({
        where: { route },
        update: {},
        create: { route, description: describe(label) },
      });
      if (!existing) created++;

      const roles = [adminRole, ...(viewerRole && readOnly ? [viewerRole] : [])];
      for (const role of roles) {
        const link = await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
        if (link) linked++;
      }
    }
  }

  console.log(`✅ Sales pipeline permissions: ${created} new permission(s), ${linked} role link(s) ensured.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
