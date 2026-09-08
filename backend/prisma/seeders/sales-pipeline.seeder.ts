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

const MODULES: { module: string; label: string }[] = [
  { module: 'projects', label: 'Project' },
  { module: 'proposals', label: 'Proposal' },
  { module: 'boqs', label: 'BoQ' },
  { module: 'sales-items', label: 'Sales Item' },
  { module: 'invoices', label: 'Invoice' },
  { module: 'receive-vouchers', label: 'Receive Voucher' },
  { module: 'payment-vouchers', label: 'Payment Voucher' },
];

const ACTIONS: { action: string; describe: (label: string) => string; readOnly: boolean }[] = [
  { action: 'index', describe: (l) => `View ${l}s`, readOnly: true },
  { action: 'show', describe: (l) => `Show ${l} Details`, readOnly: true },
  { action: 'create', describe: (l) => `Create ${l}`, readOnly: false },
  { action: 'update', describe: (l) => `Update ${l}`, readOnly: false },
  { action: 'delete', describe: (l) => `Delete ${l}`, readOnly: false },
];

/**
 * Sidebar entries. The frontend derives each URL from the linked permission route
 * (`projects.index` -> `/projects`), so pointing a menu at its real permission is
 * what makes the page reachable. Ids match the auth seeder's numbering scheme so a
 * re-seed lands on the same rows instead of duplicating them.
 */
const MENUS: { id: number; parentId: number; name: string; icon: string; route: string; order: number }[] = [
  { id: 5001, parentId: 500, name: 'Projects', icon: 'Briefcase', route: 'projects.index', order: 1 },
  { id: 5002, parentId: 500, name: 'Proposals', icon: 'ClipboardList', route: 'proposals.index', order: 2 },
  { id: 3001, parentId: 300, name: 'Invoices', icon: 'FileText', route: 'invoices.index', order: 1 },
  { id: 3002, parentId: 300, name: 'Receive Vouchers', icon: 'ArrowDownRight', route: 'receive-vouchers.index', order: 2 },
  { id: 3003, parentId: 300, name: 'Payment Vouchers', icon: 'ArrowUpRight', route: 'payment-vouchers.index', order: 3 },
];

export async function seedSalesPipelinePermissions(prisma: PrismaClient) {
  console.log('🔐 Seeding sales pipeline permissions and menus...');

  const [adminRole, viewerRole] = await Promise.all([
    prisma.role.findUnique({ where: { slug: 'admin' } }),
    prisma.role.findUnique({ where: { slug: 'viewer' } }),
  ]);

  if (!adminRole) throw new Error('Role "admin" not found — run the auth seeder first.');

  let created = 0;
  let linked = 0;

  for (const { module, label } of MODULES) {
    for (const { action, describe, readOnly } of ACTIONS) {
      const route = `${module}.${action}`;

      const existing = await prisma.permission.findUnique({ where: { route } });
      const permission = await prisma.permission.upsert({
        where: { route },
        update: {},
        create: { route, description: describe(label) },
      });
      if (!existing) created++;

      const roles = [adminRole, ...(viewerRole && readOnly ? [viewerRole] : [])];
      for (const role of roles) {
        const link = await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
        if (link) linked++;
      }
    }
  }

  console.log(`✅ Sales pipeline permissions: ${created} new permission(s), ${linked} role link(s) ensured.`);

  // Menus: the seeder ships these rows pointing at a placeholder permission, so the
  // sidebar links resolve to /finance until they are repointed here.
  let menusTouched = 0;

  for (const menu of MENUS) {
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
    menusTouched++;

    for (const role of [adminRole, ...(viewerRole ? [viewerRole] : [])]) {
      await prisma.roleMenu.upsert({
        where: { roleId_menuId: { roleId: role.id, menuId: BigInt(menu.id) } },
        update: {},
        create: { roleId: role.id, menuId: BigInt(menu.id) },
      });
    }
  }

  console.log(`✅ Sales pipeline menus: ${menusTouched} menu row(s) ensured.`);
}
