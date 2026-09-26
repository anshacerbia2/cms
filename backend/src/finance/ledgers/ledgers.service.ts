import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { accountsUsing, lockAccounts } from '../common/ledger-lock';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LEDGER_ALIASES,
  REPORT_LEDGER_CODES,
  REPORT_SUB_LEDGER_CODES,
  SUB_LEDGER_ALIASES,
  ledgerKey,
} from '../common/ledger-refs';
import { CreateLedgerDto, CreateSubLedgerDto, UpdateLedgerDto, UpdateSubLedgerDto } from './dto/ledger.dto';

/** Kunci yang dipakai resolver untuk mencocokkan nama, termasuk alias ejaan lama. */
const keyOf = (name: string, aliases: Record<string, string>) => {
  const key = ledgerKey(name);
  return aliases[key] ?? key;
};

/**
 * Master Ledger dan Sub Ledger 1 untuk Bank Statement.
 *
 * Transaksi menyimpan id-nya; `col_f`/`col_g` adalah cermin nama. Karena itu
 * mengganti nama di sini ikut menulis ulang cermin di semua baris yang memakainya,
 * dan yang masih dipakai tidak bisa dihapus - dinonaktifkan saja, supaya hilang
 * dari dropdown tanpa mengubah baris lama.
 */
@Injectable()
export class LedgersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Seluruh pohon, dengan jumlah transaksi per baris untuk halaman master. */
  async tree() {
    const [ledgers, byLedger, bySub] = await Promise.all([
      this.prisma.ledger.findMany({
        // A-Z, sama dengan daftar di filter kolom Ledger. Urutan lama (order_index,
        // menurut seberapa sering dipakai) membuat isi yang sama terlihat berbeda.
        orderBy: { name: 'asc' },
        include: { subLedgers: { orderBy: { name: 'asc' } } },
      }),
      this.prisma.financialTransaction.groupBy({ by: ['ledgerId'], _count: { _all: true } }),
      this.prisma.financialTransaction.groupBy({ by: ['subLedgerId'], _count: { _all: true } }),
    ]);
    const usage = (rows: any[], key: string) =>
      new Map(rows.filter((r) => r[key] !== null).map((r) => [String(r[key]), r._count._all as number]));
    const ledgerUsage = usage(byLedger, 'ledgerId');
    const subUsage = usage(bySub, 'subLedgerId');

    return ledgers.map((l) => ({
      id: Number(l.id),
      code: l.code,
      name: l.name,
      orderIndex: l.orderIndex,
      isActive: l.isActive,
      usage: ledgerUsage.get(String(l.id)) ?? 0,
      subLedgers: l.subLedgers.map((s) => ({
        id: Number(s.id),
        ledgerId: Number(s.ledgerId),
        code: s.code,
        name: s.name,
        isActive: s.isActive,
        usage: subUsage.get(String(s.id)) ?? 0,
      })),
    }));
  }

  // --- Ledger ---

  private async findLedger(id: number) {
    const ledger = await this.prisma.ledger.findUnique({ where: { id: BigInt(id) } });
    if (!ledger) throw new NotFoundException(`Ledger ${id} not found.`);
    return ledger;
  }

  /** Dua nama yang dianggap sama oleh resolver tidak boleh berdampingan - tempel dari Excel jadi ambigu. */
  private async assertLedgerNameFree(name: string, exceptId?: bigint) {
    const key = keyOf(name, LEDGER_ALIASES);
    const clash = (await this.prisma.ledger.findMany()).find(
      (l) => l.id !== exceptId && keyOf(l.name, LEDGER_ALIASES) === key,
    );
    if (clash) throw new BadRequestException(`Ledger "${clash.name}" already exists.`);
  }

  async createLedger(dto: CreateLedgerDto) {
    const name = dto.name.trim();
    await this.assertLedgerNameFree(name);
    const last = await this.prisma.ledger.aggregate({ _max: { orderIndex: true } });
    const row = await this.prisma.ledger.create({
      data: { name, orderIndex: dto.orderIndex ?? (last._max.orderIndex ?? 0) + 1 },
    });
    return { id: Number(row.id) };
  }

  async updateLedger(id: number, dto: UpdateLedgerDto) {
    const ledger = await this.findLedger(id);
    const name = dto.name?.trim();

    if (dto.isActive === false && ledger.code && REPORT_LEDGER_CODES.has(ledger.code)) {
      throw new BadRequestException(`Ledger "${ledger.name}" is used by the financial reports and cannot be deactivated.`);
    }
    if (name && name !== ledger.name) await this.assertLedgerNameFree(name, ledger.id);

    await this.prisma.$transaction(async (tx) => {
      // Ganti nama menulis ulang teks Ledger di baris-baris Bank Statement;
      // rekening-rekening itu dikunci dulu seperti penyimpanan Bank Statement.
      if (name && name !== ledger.name) await lockAccounts(tx, await accountsUsing(tx, { ledgerId: ledger.id }));
      await tx.ledger.update({
        where: { id: ledger.id },
        data: { name, orderIndex: dto.orderIndex, isActive: dto.isActive },
      });
      if (name && name !== ledger.name) {
        await tx.financialTransaction.updateMany({ where: { ledgerId: ledger.id }, data: { colF: name } });
      }
    });
    return { success: true };
  }

  async deleteLedger(id: number) {
    const ledger = await this.findLedger(id);
    if (ledger.code && REPORT_LEDGER_CODES.has(ledger.code)) {
      throw new BadRequestException(`Ledger "${ledger.name}" is used by the financial reports and cannot be deleted.`);
    }
    const used = await this.prisma.financialTransaction.count({ where: { ledgerId: ledger.id } });
    if (used > 0) {
      throw new BadRequestException(
        `Ledger "${ledger.name}" is used by ${used} transaction(s). Deactivate it instead to hide it from the dropdown.`,
      );
    }
    // Sub Ledger-nya ikut terhapus: tanpa Ledger yang dipakai, tidak ada transaksi yang memakai mereka.
    await this.prisma.$transaction([
      this.prisma.subLedger.deleteMany({ where: { ledgerId: ledger.id } }),
      this.prisma.ledger.delete({ where: { id: ledger.id } }),
    ]);
    return { success: true };
  }

  // --- Sub Ledger 1 ---

  private async findSub(id: number) {
    const sub = await this.prisma.subLedger.findUnique({ where: { id: BigInt(id) } });
    if (!sub) throw new NotFoundException(`Sub Ledger ${id} not found.`);
    return sub;
  }

  private async assertSubNameFree(ledgerId: bigint, name: string, exceptId?: bigint) {
    const key = keyOf(name, SUB_LEDGER_ALIASES);
    const clash = (await this.prisma.subLedger.findMany({ where: { ledgerId } })).find(
      (s) => s.id !== exceptId && keyOf(s.name, SUB_LEDGER_ALIASES) === key,
    );
    if (clash) throw new BadRequestException(`Sub Ledger "${clash.name}" already exists under this Ledger.`);
  }

  async createSubLedger(ledgerId: number, dto: CreateSubLedgerDto) {
    const ledger = await this.findLedger(ledgerId);
    const name = dto.name.trim();
    await this.assertSubNameFree(ledger.id, name);
    const row = await this.prisma.subLedger.create({ data: { ledgerId: ledger.id, name } });
    return { id: Number(row.id) };
  }

  async updateSubLedger(id: number, dto: UpdateSubLedgerDto) {
    const sub = await this.findSub(id);
    const name = dto.name?.trim();

    if (dto.isActive === false && sub.code && REPORT_SUB_LEDGER_CODES.has(sub.code)) {
      throw new BadRequestException(`Sub Ledger "${sub.name}" is used by the financial reports and cannot be deactivated.`);
    }
    if (name && name !== sub.name) await this.assertSubNameFree(sub.ledgerId, name, sub.id);

    await this.prisma.$transaction(async (tx) => {
      if (name && name !== sub.name) await lockAccounts(tx, await accountsUsing(tx, { subLedgerId: sub.id }));
      await tx.subLedger.update({ where: { id: sub.id }, data: { name, isActive: dto.isActive } });
      if (name && name !== sub.name) {
        await tx.financialTransaction.updateMany({ where: { subLedgerId: sub.id }, data: { colG: name } });
      }
    });
    return { success: true };
  }

  async deleteSubLedger(id: number) {
    const sub = await this.findSub(id);
    if (sub.code && REPORT_SUB_LEDGER_CODES.has(sub.code)) {
      throw new BadRequestException(`Sub Ledger "${sub.name}" is used by the financial reports and cannot be deleted.`);
    }
    const used = await this.prisma.financialTransaction.count({ where: { subLedgerId: sub.id } });
    if (used > 0) {
      throw new BadRequestException(
        `Sub Ledger "${sub.name}" is used by ${used} transaction(s). Deactivate it instead to hide it from the dropdown.`,
      );
    }
    await this.prisma.subLedger.delete({ where: { id: sub.id } });
    return { success: true };
  }
}
