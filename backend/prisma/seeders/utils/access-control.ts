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

export type ModuleSpec = { module: string; label: string };

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
};

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
 * wipe-and-rebuild would destroy live menu assignments. Nothing here deletes.
 */
export async function ensurePermissions(
  prisma: PrismaClient,
  modules: ModuleSpec[],
  actions: ActionSpec[] = CRUD_ACTIONS,
) {
  const { admin, viewer } = await requireRoles(prisma);
  let created = 0;
  let linked = 0;

  for (const { module, label } of modules) {
    for (const { action, describe, readOnly } of actions) {
      const route = `${module}.${action}`;

      const existing = await prisma.permission.findUnique({ where: { route } });
      const permission = await prisma.permission.upsert({
        where: { route },
        update: {},
        create: { route, description: describe(label) },
      });
      if (!existing) created++;

      for (const role of [admin, ...(viewer && readOnly ? [viewer] : [])]) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
        linked++;
      }
    }
  }

  return { created, linked };
}

/**
 * Creates the sidebar entries and grants them to admin (and viewer, when present).
 * A menu whose parent is missing is skipped rather than silently reparented to
 * the top level, where it would appear as a stray root item.
 */
export async function ensureMenus(prisma: PrismaClient, menus: MenuSpec[]) {
  const { admin, viewer } = await requireRoles(prisma);
  let touched = 0;

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

    for (const role of [admin, ...(viewer ? [viewer] : [])]) {
      await prisma.roleMenu.upsert({
        where: { roleId_menuId: { roleId: role.id, menuId: BigInt(menu.id) } },
        update: {},
        create: { roleId: role.id, menuId: BigInt(menu.id) },
      });
    }
  }

  await syncMenuIdSequence(prisma);

  return { touched };
}

/** Top-level sidebar group, e.g. "Settings". Groups carry no permission of their own. */
export async function ensureMenuGroup(
  prisma: PrismaClient,
  group: { id: number; name: string; icon: string; order: number },
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

  const { admin, viewer } = await requireRoles(prisma);
  for (const role of [admin, ...(viewer ? [viewer] : [])]) {
    await prisma.roleMenu.upsert({
      where: { roleId_menuId: { roleId: role.id, menuId: BigInt(group.id) } },
      update: {},
      create: { roleId: role.id, menuId: BigInt(group.id) },
    });
  }

  await syncMenuIdSequence(prisma);
}
