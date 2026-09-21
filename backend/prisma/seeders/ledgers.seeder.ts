/**
 * Master Ledger / Sub Ledger 1 untuk Bank Statement: isi master, penghubungan
 * transaksi ke master, dan permission + menu Finance > Ledgers.
 *
 * Semuanya upsert dan aman diulang, jadi satu perintah ini yang dijalankan di
 * produksi: `pnpm seed:ledgers`. Di dev, `prisma db seed` memanggilnya, dan
 * `pnpm seed:year` memastikan masternya ada sebelum memuat bank statement.
 *
 * Daftar masternya ada di `data/ledger-master.ts`.
 */
import { PrismaClient } from '@prisma/client';
import { ensureMenus, ensurePermissions, MenuSpec, ModuleSpec } from './utils/access-control';
import { LEDGER_MASTER } from './data/ledger-master';
import {
  LEDGER_ALIASES,
  LedgerDirectory,
  SUB_LEDGER_ALIASES,
  ledgerKey,
} from '../../src/finance/common/ledger-refs';

const keyOf = (name: string, aliases: Record<string, string>) => {
  const key = ledgerKey(name);
  return aliases[key] ?? key;
};

/**
 * Memastikan setiap Ledger dan Sub Ledger 1 di `LEDGER_MASTER` ada, dengan
 * code-nya. Yang sudah ada dicocokkan lewat code, lalu lewat nama (termasuk
 * ejaan lama) - dan namanya TIDAK ditimpa: nama yang diganti di halaman Ledgers
 * harus bertahan. Yang tidak ada di daftar dibiarkan.
 */
export async function seedLedgerMaster(prisma: PrismaClient) {
  const created: string[] = [];

  for (const [order, spec] of LEDGER_MASTER.entries()) {
    const existing = await prisma.ledger.findMany();
    let ledger =
      existing.find((l) => l.code === spec.code) ??
      existing.find((l) => keyOf(l.name, LEDGER_ALIASES) === keyOf(spec.name, LEDGER_ALIASES));

    if (!ledger) {
      ledger = await prisma.ledger.create({ data: { code: spec.code, name: spec.name, orderIndex: order + 1 } });
      created.push(`Ledger "${spec.name}"`);
    } else if (ledger.code !== spec.code) {
      ledger = await prisma.ledger.update({ where: { id: ledger.id }, data: { code: spec.code } });
    }

    const subs = await prisma.subLedger.findMany({ where: { ledgerId: ledger.id } });
    for (const subSpec of spec.subLedgers) {
      const sub =
        (subSpec.code && subs.find((s) => s.code === subSpec.code)) ||
        subs.find((s) => keyOf(s.name, SUB_LEDGER_ALIASES) === keyOf(subSpec.name, SUB_LEDGER_ALIASES));
      if (!sub) {
        await prisma.subLedger.create({ data: { ledgerId: ledger.id, name: subSpec.name, code: subSpec.code } });
        created.push(`Sub Ledger "${subSpec.name}" di bawah "${spec.name}"`);
      } else if (subSpec.code && sub.code !== subSpec.code) {
        await prisma.subLedger.update({ where: { id: sub.id }, data: { code: subSpec.code } });
      }
    }
  }

  return created;
}

/**
 * Menghubungkan transaksi yang belum punya `ledger_id` / `sub_ledger_id` ke
 * master, dan menulis ulang `col_f` / `col_g` ke nama master (ejaan kembar jadi
 * satu). Dikerjakan per pasangan nama, bukan per baris. Nilai yang tidak ada di
 * master dibuat, supaya tidak ada baris yang lepas dari laporan.
 */
export async function linkLedgerTransactions(prisma: PrismaClient) {
  const unlinked = { OR: [{ colF: { not: '' }, ledgerId: null }, { colG: { not: '' }, subLedgerId: null }] };
  const pairs = await prisma.financialTransaction.groupBy({
    by: ['colF', 'colG'],
    where: unlinked,
    _count: { _all: true },
  });

  const dir = await LedgerDirectory.load(prisma);
  let linked = 0;
  for (const pair of pairs) {
    const ref = await dir.resolve({ colF: pair.colF, colG: pair.colG }, { create: true });
    const { count } = await prisma.financialTransaction.updateMany({
      where: { AND: [unlinked, { colF: pair.colF, colG: pair.colG }] },
      data: {
        ledgerId: ref.ledgerId,
        subLedgerId: ref.subLedgerId,
        colF: ref.colF ?? '',
        colG: ref.colG ?? '',
      },
    });
    linked += count;
  }

  return { linked, created: dir.created };
}

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

/** Semuanya: master, penghubungan transaksi, lalu permission dan menu. */
export async function seedLedgers(prisma: PrismaClient) {
  console.log('📒 Seeding ledger master...');
  const created = await seedLedgerMaster(prisma);
  const link = await linkLedgerTransactions(prisma);
  const added = [...created, ...link.created];
  const [ledgers, subs] = await Promise.all([prisma.ledger.count(), prisma.subLedger.count()]);
  console.log(
    `✅ Ledger master: ${ledgers} ledger(s), ${subs} sub ledger(s)` +
      // Database baru mendapat semuanya sekaligus - cukup jumlahnya. Tambahan
      // satu-dua (nilai baru dari workbook) disebutkan namanya.
      (added.length > 10 ? `; added ${added.length}` : added.length ? `; added ${added.join(', ')}` : '') +
      `. Linked ${link.linked} transaction(s).`,
  );
  await seedLedgerPermissions(prisma);
}
