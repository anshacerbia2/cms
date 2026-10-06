import { PrismaClient } from '@prisma/client';
import { ensureMenus, ensurePermissions, MenuSpec, ModuleSpec } from './utils/access-control';

/**
 * Tujuan alert keamanan (Telegram, Google Chat): memegang kredensial, jadi
 * hanya admin. Kirim pesan uji memakai izin update.
 */
const MODULES: ModuleSpec[] = [{ module: 'notification-channels', label: 'Notification Channel', adminOnly: true }];

const MENUS: MenuSpec[] = [
  { id: 6006, parentId: 600, name: 'Notification Channels', icon: 'BellRing', route: 'notification-channels.index', order: 6, adminOnly: true },
];

export async function seedNotificationChannelPermissions(prisma: PrismaClient) {
  console.log('🔔 Seeding notification channel permissions...');
  const { created, linked } = await ensurePermissions(prisma, MODULES);
  console.log(`✅ Notification channel permissions: ${created} new, ${linked} role link(s) ensured.`);
  const menus = await ensureMenus(prisma, MENUS);
  console.log(`✅ Notification channel menus: ${menus.touched} menu row(s) ensured.`);
}
