/**
 * Permissions and sidebar entries for managing access control itself.
 *
 * Until this ran, roles, permissions and menus could only be changed by writing a
 * seeder script by hand — there was no API and no screen for any of them.
 *
 * Upsert-only, like [ensurePermissions]; safe to run against production via
 *
 *   npx tsx prisma/scripts/rbac-permissions.ts
 */
import { PrismaClient } from '@prisma/client';
import { ensureMenuGroup, ensureMenus, ensurePermissions, MenuSpec, ModuleSpec } from './utils/access-control';

const MODULES: ModuleSpec[] = [
  { module: 'roles', label: 'Role' },
  { module: 'permissions', label: 'Permission' },
  { module: 'menus', label: 'Menu' },
  // `users.index` already exists from the auth seeder; the upsert leaves it alone
  // and fills in the four write actions the module was missing.
  { module: 'users', label: 'User' },
];

const SETTINGS_GROUP = { id: 600, name: 'Settings', icon: 'Settings', order: 6 };

const MENUS: MenuSpec[] = [
  { id: 6001, parentId: 600, name: 'Roles', icon: 'ShieldCheck', route: 'roles.index', order: 1 },
  { id: 6002, parentId: 600, name: 'Permissions', icon: 'KeyRound', route: 'permissions.index', order: 2 },
  { id: 6003, parentId: 600, name: 'Menus', icon: 'ListTree', route: 'menus.index', order: 3 },
];

export async function seedRbacPermissions(prisma: PrismaClient) {
  console.log('🛡️  Seeding access control permissions and menus...');

  const { created, linked } = await ensurePermissions(prisma, MODULES);
  console.log(`✅ Access control permissions: ${created} new permission(s), ${linked} role link(s) ensured.`);

  // The group has to exist before its children can point a parentId at it.
  await ensureMenuGroup(prisma, SETTINGS_GROUP);

  const { touched } = await ensureMenus(prisma, MENUS);
  console.log(`✅ Access control menus: ${touched} menu row(s) ensured.`);
}
