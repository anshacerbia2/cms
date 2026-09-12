/**
 * Fills in the product category permissions the auth seeder never shipped.
 *
 * It creates only `product-categories.index` and `.create`, so a category could be
 * added but never corrected or removed — a typo in a name was permanent. The
 * endpoints now exist; these are the grants that let anyone reach them.
 *
 * Upsert-only, safe against production:
 *
 *   npx tsx prisma/scripts/product-category-permissions.ts
 */
import { PrismaClient } from '@prisma/client';
import { ensurePermissions, ModuleSpec } from './utils/access-control';

const MODULES: ModuleSpec[] = [{ module: 'product-categories', label: 'Product Category' }];

export async function seedProductCategoryPermissions(prisma: PrismaClient) {
  console.log('🏷️  Seeding product category permissions...');

  const { created, linked } = await ensurePermissions(prisma, MODULES);
  console.log(`✅ Product category permissions: ${created} new permission(s), ${linked} role link(s) ensured.`);
}
