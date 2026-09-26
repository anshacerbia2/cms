/**
 * Permissions and sidebar entries for managing access control itself.
 *
 * Until this ran, roles, permissions and menus could only be changed by writing a
 * seeder script by hand — there was no API and no screen for any of them.
 *
 * Upsert-only, like [ensurePermissions]; safe to run against production via
 *
 *   pnpm seed:access
 */
import { PrismaClient } from '@prisma/client';
import { ensureMenuGroup, ensureMenus, ensurePermissions, MENU_GROUP_ORDER, MenuSpec, ModuleSpec } from './utils/access-control';

// Access control is configuration, not data: `viewer` gets no read on it either,
// or a read-only account could enumerate every role and grant in the system.
const MODULES: ModuleSpec[] = [
  { module: 'roles', label: 'Role', adminOnly: true },
  { module: 'permissions', label: 'Permission', adminOnly: true },
  { module: 'menus', label: 'Menu', adminOnly: true },
  // Not adminOnly: the staff directory is business data, and the auth seeder
  // already grants `users.index` to viewer for the Master Data › Staff entry.
  // `users.index` already exists from the auth seeder; the upsert leaves it alone
  // and fills in the four write actions the module was missing.
  { module: 'users', label: 'User' },
];

const SETTINGS_GROUP = { id: 600, name: 'Settings', icon: 'Settings', order: MENU_GROUP_ORDER[600], adminOnly: true };

const MENUS: MenuSpec[] = [
  { id: 6001, parentId: 600, name: 'Roles', icon: 'ShieldCheck', route: 'roles.index', order: 1, adminOnly: true },
  { id: 6002, parentId: 600, name: 'Permissions', icon: 'KeyRound', route: 'permissions.index', order: 2, adminOnly: true },
  { id: 6003, parentId: 600, name: 'Menus', icon: 'ListTree', route: 'menus.index', order: 3, adminOnly: true },
];

export async function seedRbacPermissions(prisma: PrismaClient) {
  console.log('🛡️  Seeding access control permissions and menus...');

  const { created, linked, revoked } = await ensurePermissions(prisma, MODULES);
  console.log(`✅ Access control permissions: ${created} new permission(s), ${linked} role link(s) ensured.`);
  if (revoked) console.log(`↩️  Withdrew ${revoked} viewer grant(s) on access control.`);

  // The group has to exist before its children can point a parentId at it.
  const group = await ensureMenuGroup(prisma, SETTINGS_GROUP);

  const menus = await ensureMenus(prisma, MENUS);
  console.log(`✅ Access control menus: ${menus.touched} menu row(s) ensured.`);
  if (menus.revoked || group.revoked)
    console.log(`↩️  Removed the Settings group from ${menus.revoked + group.revoked} viewer sidebar entr(ies).`);
}
