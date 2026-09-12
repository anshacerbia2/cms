/**
 * Idempotent, upsert-only permissions and menus for the sales pipeline modules.
 *
 * Deliberately upsert-only: `auth.seeder.ts` wipes menus/role_menu before rebuilding
 * them, which is unsafe against a live database. This one only ever upserts, so it is
 * also the piece that can be run on its own against production:
 *
 *   npx tsx prisma/scripts/sales-pipeline-permissions.ts
 */
import { PrismaClient } from '@prisma/client';
import { ensureMenus, ensurePermissions, MenuSpec, ModuleSpec } from './utils/access-control';

/**
 * Sales items are deliberately absent: they are created and replaced only as part
 * of their proposal or invoice, which recomputes the parent total in the same
 * transaction. A standalone CRUD would let a row change without that recompute,
 * leaving the proposal's total disagreeing with its own items.
 */
const MODULES: ModuleSpec[] = [
  { module: 'projects', label: 'Project' },
  { module: 'proposals', label: 'Proposal' },
  { module: 'boqs', label: 'BoQ' },
  { module: 'invoices', label: 'Invoice' },
  { module: 'receive-vouchers', label: 'Receive Voucher' },
  { module: 'payment-vouchers', label: 'Payment Voucher' },
];

/**
 * The auth seeder ships these rows pointing at a placeholder permission, so the
 * sidebar links resolve to /finance until they are repointed here.
 */
const MENUS: MenuSpec[] = [
  { id: 5001, parentId: 500, name: 'Projects', icon: 'Briefcase', route: 'projects.index', order: 1 },
  { id: 5002, parentId: 500, name: 'Proposals', icon: 'ClipboardList', route: 'proposals.index', order: 2 },
  { id: 3001, parentId: 300, name: 'Invoices', icon: 'FileText', route: 'invoices.index', order: 1 },
  { id: 3002, parentId: 300, name: 'Receive Vouchers', icon: 'ArrowDownRight', route: 'receive-vouchers.index', order: 2 },
  { id: 3003, parentId: 300, name: 'Payment Vouchers', icon: 'ArrowUpRight', route: 'payment-vouchers.index', order: 3 },
];

export async function seedSalesPipelinePermissions(prisma: PrismaClient) {
  console.log('🔐 Seeding sales pipeline permissions and menus...');

  const { created, linked } = await ensurePermissions(prisma, MODULES);
  console.log(`✅ Sales pipeline permissions: ${created} new permission(s), ${linked} role link(s) ensured.`);

  const { touched } = await ensureMenus(prisma, MENUS);
  console.log(`✅ Sales pipeline menus: ${touched} menu row(s) ensured.`);
}
