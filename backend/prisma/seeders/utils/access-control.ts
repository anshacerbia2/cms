import { PrismaClient } from '@prisma/client';

/**
 * Menus are seeded with hardcoded ids, which leaves the identity
 * sequence untouched at 1. A menu later created through the API would then be
 * handed id 1, 2, 3 … and eventually collide with a seeded row (100, 200, 1001).
 * Realigning the sequence after every explicit-id write closes that gap.
 */
export async function syncMenuIdSequence(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('menus', 'id'), (SELECT COALESCE(MAX(id), 1) FROM menus))`,
  );
}

/**
 * Administrative modules — access control, print layouts — are the configuration
 * of the app rather than its data, so a read-only role gets nothing there, not
 * even the index. Without this the `readOnly` rule below would hand `viewer`
 * `roles.index` and `permissions.index` and let it read the whole grant table.
 */
export type AdminOnly = { adminOnly?: boolean };

export type ModuleSpec = { module: string; label: string } & AdminOnly;

export type ActionSpec = {
  action: string;
  describe: (label: string) => string;
  /** Read-only actions are also granted to `viewer`; the rest are admin-only. */
  readOnly: boolean;
};

export type MenuSpec = {
  /** Fixed ids so a re-run lands on the same rows instead of duplicating them. */
  id: number;
  parentId: number;
  name: string;
  icon: string;
  /** Permission route the sidebar derives this entry's URL from. */
  route: string;
  order: number;
} & AdminOnly;

/** The five actions every CRUD module exposes. */
export const CRUD_ACTIONS: ActionSpec[] = [
  { action: 'index', describe: (l) => `View ${l}s`, readOnly: true },
  { action: 'show', describe: (l) => `Show ${l} Details`, readOnly: true },
  { action: 'create', describe: (l) => `Create ${l}`, readOnly: false },
  { action: 'update', describe: (l) => `Update ${l}`, readOnly: false },
  { action: 'delete', describe: (l) => `Delete ${l}`, readOnly: false },
];

async function requireRoles(prisma: PrismaClient) {
  const [admin, viewer] = await Promise.all([
    prisma.role.findUnique({ where: { slug: 'admin' } }),
    prisma.role.findUnique({ where: { slug: 'viewer' } }),
  ]);

  if (!admin) throw new Error('Role "admin" not found — run the auth seeder first.');
  return { admin, viewer };
}

/**
 * Upsert-only on purpose: this runs against production, where the auth seeder's
 * wipe-and-rebuild would destroy live menu assignments. Nothing here deletes —
 * with one exception, noted at each call site: a `viewer` grant on something
 * declared `adminOnly` is withdrawn, because an earlier run of this same seeder
 * is the only thing that could have created it.
 */
export async function ensurePermissions(
  prisma: PrismaClient,
  modules: ModuleSpec[],
  actions: ActionSpec[] = CRUD_ACTIONS,
) {
  const { admin, viewer } = await requireRoles(prisma);
  let created = 0;
  let linked = 0;
  let revoked = 0;

  for (const { module, label, adminOnly } of modules) {
    for (const { action, describe, readOnly } of actions) {
      const route = `${module}.${action}`;

      const existing = await prisma.permission.findUnique({ where: { route } });
      const permission = await prisma.permission.upsert({
        where: { route },
        update: {},
        create: { route, description: describe(label) },
      });
      if (!existing) created++;

      const grantees = [admin, ...(viewer && readOnly && !adminOnly ? [viewer] : [])];

      for (const role of grantees) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
        linked++;
      }

      // Withdraw an over-grant a previous run made before `adminOnly` existed.
      if (viewer && adminOnly) {
        const { count } = await prisma.rolePermission.deleteMany({
          where: { roleId: viewer.id, permissionId: permission.id },
        });
        revoked += count;
      }
    }
  }

  return { created, linked, revoked };
}

type Roles = Awaited<ReturnType<typeof requireRoles>>;

/** Grants a menu to admin, and to viewer unless the entry is administrative. */
async function grantMenu(
  prisma: PrismaClient,
  roles: Roles,
  menuId: number,
  adminOnly?: boolean,
) {
  const { admin, viewer } = roles;

  for (const role of [admin, ...(viewer && !adminOnly ? [viewer] : [])]) {
    await prisma.roleMenu.upsert({
      where: { roleId_menuId: { roleId: role.id, menuId: BigInt(menuId) } },
      update: {},
      create: { roleId: role.id, menuId: BigInt(menuId) },
    });
  }

  if (viewer && adminOnly) {
    const { count } = await prisma.roleMenu.deleteMany({
      where: { roleId: viewer.id, menuId: BigInt(menuId) },
    });
    return count;
  }

  return 0;
}

/**
 * Creates the sidebar entries and grants them to admin (and viewer, when present
 * and the entry is not administrative).
 * A menu whose parent is missing is skipped rather than silently reparented to
 * the top level, where it would appear as a stray root item.
 */
export async function ensureMenus(prisma: PrismaClient, menus: MenuSpec[]) {
  const roles = await requireRoles(prisma);
  let touched = 0;
  let revoked = 0;

  for (const menu of menus) {
    const parent = await prisma.menu.findUnique({ where: { id: BigInt(menu.parentId) } });
    if (!parent) {
      console.warn(`⚠️  Parent menu ${menu.parentId} missing — skipping "${menu.name}".`);
      continue;
    }

    const permission = await prisma.permission.findUnique({ where: { route: menu.route } });
    if (!permission) throw new Error(`Permission "${menu.route}" not found.`);

    const data = {
      name: menu.name,
      icon: menu.icon,
      parentId: parent.id,
      permissionId: permission.id,
      orderIndex: menu.order,
      isVisible: true,
    };

    await prisma.menu.upsert({
      where: { id: BigInt(menu.id) },
      update: data,
      create: { id: BigInt(menu.id), ...data },
    });
    touched++;

    revoked += await grantMenu(prisma, roles, menu.id, menu.adminOnly);
  }

  await syncMenuIdSequence(prisma);

  return { touched, revoked };
}

/** Top-level sidebar group, e.g. "Settings". Groups carry no permission of their own. */
export async function ensureMenuGroup(
  prisma: PrismaClient,
  group: { id: number; name: string; icon: string; order: number } & AdminOnly,
) {
  const data = {
    name: group.name,
    icon: group.icon,
    parentId: null,
    permissionId: null,
    orderIndex: group.order,
    isVisible: true,
  };

  await prisma.menu.upsert({
    where: { id: BigInt(group.id) },
    update: data,
    create: { id: BigInt(group.id), ...data },
  });

  const roles = await requireRoles(prisma);
  const revoked = await grantMenu(prisma, roles, group.id, group.adminOnly);

  await syncMenuIdSequence(prisma);

  return { revoked };
}
