import { BadRequestException } from '@nestjs/common';

/**
 * Master Ledger dan Sub Ledger 1 untuk Bank Statement: normalisasi nama, alias,
 * code yang dipakai laporan, dan resolver yang dipakai setiap penulis transaksi.
 *
 * `financial_transactions.ledger_id`/`sub_ledger_id` adalah sumber kebenaran.
 * `col_f`/`col_g` tetap ada sebagai cermin nama - migrasi prod hanya boleh
 * menambah, jadi kolomnya belum bisa dihapus - dan SELALU ditulis ulang dari
 * nama master lewat `resolve()` di sini. Jangan menulis `colF`/`colG` langsung.
 */

/**
 * Kunci pembanding: huruf kecil, `( ) /` jadi spasi, spasi dirapatkan.
 * Dipakai seeder (`prisma/seeders/ledgers.seeder.ts`), aplikasi, dan frontend
 * (`hooks/useLedgers.ts`) - ketiganya harus sama.
 */
export function ledgerKey(name: string | null | undefined): string {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[()/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ejaan Ledger yang sudah disatukan, dari kunci ke kunci. */
export const LEDGER_ALIASES: Record<string, string> = {
  'retained earning': 'retained earnings',
};

/** Ejaan Sub Ledger 1 yang sudah disatukan. */
export const SUB_LEDGER_ALIASES: Record<string, string> = {
  'bank charges': 'bank charge',
  'meal allowance': 'meals allowance',
  deviden: 'dividend',
};

const aliased = (key: string, aliases: Record<string, string>) => aliases[key] ?? key;

/**
 * Code yang disaring laporan. Laporan TIDAK BOLEH menyaring lewat nama: nama
 * bisa diganti di halaman master, dan mengganti "Cost of Goods" jadi "HPP"
 * akan menghilangkan seluruh COGS dari P&L tanpa ada yang sadar.
 */
export const LEDGER_CODE = {
  COGS: 'COGS',
  PERSONNEL_EXPENSE: 'PERSONNEL_EXPENSE',
  OFFICE_EXPENSE: 'OFFICE_EXPENSE',
  MARKETING_EXPENSE: 'MARKETING_EXPENSE',
  FINANCIAL_EXPENSE: 'FINANCIAL_EXPENSE',
  OTHER_INCOME_EXPENSE: 'OTHER_INCOME_EXPENSE',
  INCOME_TAX: 'INCOME_TAX',
  RETAINED_EARNINGS: 'RETAINED_EARNINGS',
} as const;

export const SUB_LEDGER_CODE = {
  DIVIDEND: 'DIVIDEND',
} as const;

/** Baris ber-code ini dipakai laporan: code-nya dikunci, dan tidak bisa dihapus/dinonaktifkan. */
export const REPORT_LEDGER_CODES = new Set<string>(Object.values(LEDGER_CODE));
export const REPORT_SUB_LEDGER_CODES = new Set<string>(Object.values(SUB_LEDGER_CODE));

type LedgerRow = { id: bigint; name: string; code: string | null; isActive: boolean };
type SubLedgerRow = { id: bigint; ledgerId: bigint; name: string; code: string | null; isActive: boolean };

/** Hasil resolve: FK dan cermin teksnya, siap ditulis ke `financial_transactions`. */
export type LedgerRef = {
  ledgerId: bigint | null;
  subLedgerId: bigint | null;
  colF: string | null;
  colG: string | null;
};

export type LedgerInput = {
  ledgerId?: number | string | bigint | null;
  subLedgerId?: number | string | bigint | null;
  /** Nama, untuk tempel dari Excel dan seeder. Dipakai hanya kalau id tidak diberikan. */
  colF?: string | null;
  colG?: string | null;
};

const toId = (v: unknown): bigint | null =>
  v === null || v === undefined || v === '' ? null : BigInt(v as any);

/**
 * Isi master yang dimuat sekali, untuk me-resolve banyak baris tanpa query per baris.
 *
 * Seeder memakai `create: true` supaya nilai workbook yang belum ada di master
 * dibuat dan dilaporkan - seed tidak boleh membuang data. Aplikasi memakai
 * default `create: false`: nama yang tidak dikenal ditolak dengan jelas.
 */
export class LedgerDirectory {
  private ledgersById = new Map<bigint, LedgerRow>();
  private ledgersByKey = new Map<string, LedgerRow>();
  private subsById = new Map<bigint, SubLedgerRow>();
  private subsByKey = new Map<string, SubLedgerRow>();
  /** Master yang dibuat selama resolve (hanya dengan `create: true`), untuk dilaporkan. */
  readonly created: string[] = [];

  private constructor(private readonly prisma: any) {}

  static async load(prisma: any): Promise<LedgerDirectory> {
    const dir = new LedgerDirectory(prisma);
    const [ledgers, subs] = await Promise.all([
      prisma.ledger.findMany(),
      prisma.subLedger.findMany(),
    ]);
    for (const l of ledgers) dir.addLedger(l);
    for (const s of subs) dir.addSub(s);
    return dir;
  }

  private addLedger(l: LedgerRow) {
    this.ledgersById.set(l.id, l);
    this.ledgersByKey.set(ledgerKey(l.name), l);
  }

  private addSub(s: SubLedgerRow) {
    this.subsById.set(s.id, s);
    this.subsByKey.set(`${s.ledgerId}|${ledgerKey(s.name)}`, s);
  }

  private findLedgerByName(name: string): LedgerRow | undefined {
    return this.ledgersByKey.get(aliased(ledgerKey(name), LEDGER_ALIASES));
  }

  private findSubByName(ledgerId: bigint, name: string): SubLedgerRow | undefined {
    return this.subsByKey.get(`${ledgerId}|${aliased(ledgerKey(name), SUB_LEDGER_ALIASES)}`);
  }

  async resolve(input: LedgerInput, opts: { create?: boolean } = {}): Promise<LedgerRef> {
    let ledger: LedgerRow | undefined;
    let sub: SubLedgerRow | undefined;

    const ledgerId = toId(input.ledgerId);
    const subLedgerId = toId(input.subLedgerId);

    if (ledgerId !== null) {
      ledger = this.ledgersById.get(ledgerId);
      if (!ledger) throw new BadRequestException(`Ledger ${ledgerId} is not in the master list.`);
    } else if (input.colF && input.colF.trim() !== '') {
      ledger = this.findLedgerByName(input.colF);
      if (!ledger) {
        if (!opts.create) throw new BadRequestException(`Ledger "${input.colF}" is not in the master list.`);
        const row = await this.prisma.ledger.create({
          data: { name: input.colF.trim(), orderIndex: 1000 },
        });
        this.addLedger(row);
        this.created.push(`Ledger "${row.name}"`);
        ledger = row;
      }
    }

    if (subLedgerId !== null) {
      sub = this.subsById.get(subLedgerId);
      if (!sub) throw new BadRequestException(`Sub Ledger ${subLedgerId} is not in the master list.`);
    } else if (input.colG && input.colG.trim() !== '') {
      if (!ledger) throw new BadRequestException(`Sub Ledger "${input.colG}" needs a Ledger.`);
      sub = this.findSubByName(ledger.id, input.colG);
      if (!sub) {
        if (!opts.create) {
          throw new BadRequestException(`Sub Ledger "${input.colG}" is not under Ledger "${ledger.name}".`);
        }
        const row = await this.prisma.subLedger.create({
          data: { ledgerId: ledger.id, name: input.colG.trim() },
        });
        this.addSub(row);
        this.created.push(`Sub Ledger "${row.name}" under "${ledger.name}"`);
        sub = row;
      }
    }

    // Sub Ledger selalu milik tepat satu Ledger.
    if (sub && !ledger) ledger = this.ledgersById.get(sub.ledgerId);
    if (sub && ledger && sub.ledgerId !== ledger.id) {
      throw new BadRequestException(`Sub Ledger "${sub.name}" does not belong to Ledger "${ledger.name}".`);
    }

    return {
      ledgerId: ledger?.id ?? null,
      subLedgerId: sub?.id ?? null,
      colF: ledger?.name ?? null,
      colG: sub?.name ?? null,
    };
  }
}

/**
 * Include untuk membaca nama Ledger / Sub Ledger 1 lewat relasi. Dipakai setiap
 * query yang menampilkan transaksi - tabel, filter kolom, pencarian, export,
 * drill-down laporan - supaya yang tampil selalu nama di master.
 */
export const LEDGER_NAMES_INCLUDE = {
  ledger: { select: { name: true } },
  subLedger: { select: { name: true } },
} as const;

type WithLedgerRelations = {
  colF: string | null;
  colG: string | null;
  ledger?: { name: string } | null;
  subLedger?: { name: string } | null;
};

/**
 * `colF` / `colG` diisi dari master lewat FK; teks yang tersimpan hanya dipakai
 * untuk baris yang belum punya FK. Objek relasinya dibuang supaya bentuk
 * respons API tidak berubah.
 */
export function withLedgerNames<T extends WithLedgerRelations>(row: T) {
  const { ledger, subLedger, ...rest } = row;
  return { ...rest, colF: ledger?.name ?? row.colF, colG: subLedger?.name ?? row.colG };
}
