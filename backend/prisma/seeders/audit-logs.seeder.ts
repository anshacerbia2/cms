import { PrismaClient } from '@prisma/client';
import { ActionSpec, ensureMenus, ensurePermissions, MenuSpec, ModuleSpec } from './utils/access-control';

/**
 * Activity log: hanya bisa dibaca, dan hanya oleh admin. Role lain bisa diberi
 * akses lewat halaman Roles kalau memang perlu melihat riwayat perubahan.
 */
const MODULES: ModuleSpec[] = [{ module: 'audit-logs', label: 'Activity Log', adminOnly: true }];

const ACTIONS: ActionSpec[] = [
  { action: 'index', describe: (l) => `View ${l}`, readOnly: true },
];

const MENUS: MenuSpec[] = [
  { id: 6005, parentId: 600, name: 'Activity Log', icon: 'History', route: 'audit-logs.index', order: 5, adminOnly: true },
];

export async function seedAuditLogPermissions(prisma: PrismaClient) {
  console.log('🕵️  Seeding activity log permissions...');
  const { created, linked } = await ensurePermissions(prisma, MODULES, ACTIONS);
  console.log(`✅ Activity log permissions: ${created} new, ${linked} role link(s) ensured.`);
  const menus = await ensureMenus(prisma, MENUS);
  console.log(`✅ Activity log menus: ${menus.touched} menu row(s) ensured.`);
}
