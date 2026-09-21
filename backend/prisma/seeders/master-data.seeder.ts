/**
 * Fills in the CRUD permissions the auth seeder never shipped for master data it
 * only half-covered.
 *
 * It created `index` and `create` for both product categories and banks, so a row
 * could be added but never corrected or removed — a typo in a name was permanent,
 * and the Banks page's Edit and Delete actions had no permission behind them.
 *
 * Upsert-only, safe against production:
 *
 *   pnpm seed:access
 */
import { PrismaClient } from '@prisma/client';
import { ensurePermissions, ModuleSpec } from './utils/access-control';

const MODULES: ModuleSpec[] = [
  { module: 'product-categories', label: 'Product Category' },
  { module: 'banks', label: 'Bank' },
];

export async function seedMasterDataPermissions(prisma: PrismaClient) {
  console.log('🏷️  Seeding master data CRUD permissions...');

  const { created, linked } = await ensurePermissions(prisma, MODULES);
  console.log(`✅ Master data permissions: ${created} new permission(s), ${linked} role link(s) ensured.`);
}
