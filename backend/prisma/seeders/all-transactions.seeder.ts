import { PrismaClient } from '@prisma/client';
import { ActionSpec, ensureMenus, ensurePermissions, MenuSpec, ModuleSpec } from './utils/access-control';

/**
 * All Transactions: transaksi semua rekening (bank, Cash, Non CB) dalam satu
 * daftar, hanya untuk dicari - permintaan klien 2026-10-08. Hanya ada izin
 * melihat; tidak ada create/edit/delete. Ikut grup Finance, jadi viewer juga
 * mendapatkannya (lihat VIEWER_MODULES).
 */
const MODULES: ModuleSpec[] = [{ module: 'all-transactions', label: 'All Transactions' }];

const ACTIONS: ActionSpec[] = [{ action: 'index', describe: (l) => `View ${l}`, readOnly: true }];

const MENUS: MenuSpec[] = [
  { id: 4011, parentId: 400, name: 'All Transactions', icon: 'Search', route: 'all-transactions.index', order: 11 },
];

export async function seedAllTransactionsPermissions(prisma: PrismaClient) {
  console.log('🔎 Seeding All Transactions permission and menu...');
  const { created, linked } = await ensurePermissions(prisma, MODULES, ACTIONS);
  console.log(`✅ All Transactions permissions: ${created} new, ${linked} role link(s) ensured.`);
  const menus = await ensureMenus(prisma, MENUS);
  console.log(`✅ All Transactions menus: ${menus.touched} menu row(s) ensured.`);
}
