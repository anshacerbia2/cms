/**
 * Permission dan menu untuk master Ledger / Sub Ledger 1 (Finance > Ledgers).
 *
 * Upsert saja, jadi aman dijalankan di produksi lewat `pnpm seed:access`.
 * Isi masternya tidak di sini - itu diisi migrasi `add_ledger_master`, dan
 * nilai workbook yang belum ada ditambahkan oleh seeder tahun buku.
 */
import { PrismaClient } from '@prisma/client';
import { ensureMenus, ensurePermissions, MenuSpec, ModuleSpec } from './utils/access-control';

const MODULES: ModuleSpec[] = [{ module: 'ledgers', label: 'Ledger' }];

const MENUS: MenuSpec[] = [
  { id: 4010, parentId: 400, name: 'Ledgers', icon: 'BookOpen', route: 'ledgers.index', order: 10 },
];

/**
 * Master ini bagian dari Bank Statement, jadi siapa pun yang boleh melakukan
 * sesuatu di Bank Statement boleh melakukan hal yang sama di sini. Tanpa ini,
 * role selain admin/viewer (misalnya direktur) bisa mengisi transaksi tapi
 * tidak bisa melihat daftar Ledger yang harus dipilihnya.
 */
const FOLLOWS: Record<string, string> = {
  'ledgers.index': 'bank-mutation.index',
  'ledgers.show': 'bank-mutation.index',
  'ledgers.create': 'bank-mutation.create',
  'ledgers.update': 'bank-mutation.edit',
  'ledgers.delete': 'bank-mutation.delete',
};

export async function seedLedgerPermissions(prisma: PrismaClient) {
  console.log('📒 Seeding ledger master permissions...');

  const { created, linked } = await ensurePermissions(prisma, MODULES);

  let followed = 0;
  for (const [route, source] of Object.entries(FOLLOWS)) {
    const [permission, holders] = await Promise.all([
      prisma.permission.findUnique({ where: { route } }),
      prisma.rolePermission.findMany({ where: { permission: { route: source } }, select: { roleId: true } }),
    ]);
    if (!permission) continue;
    for (const { roleId } of holders) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permission.id } },
        update: {},
        create: { roleId, permissionId: permission.id },
      });
      followed++;
    }
  }
  console.log(`✅ Ledger permissions: ${created} new, ${linked + followed} role link(s) ensured.`);

  const menus = await ensureMenus(prisma, MENUS);
  // Menu mengikuti menu Bank Mutation dengan alasan yang sama.
  const bankMenuHolders = await prisma.roleMenu.findMany({ where: { menuId: 4002n }, select: { roleId: true } });
  for (const { roleId } of bankMenuHolders) {
    await prisma.roleMenu.upsert({
      where: { roleId_menuId: { roleId, menuId: 4010n } },
      update: {},
      create: { roleId, menuId: 4010n },
    });
  }
  console.log(`✅ Ledger menus: ${menus.touched} menu row(s) ensured.`);
}
