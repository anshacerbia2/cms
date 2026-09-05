import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentVoucherDto, PaymentVoucherQueryDto } from './dto/payment-voucher.dto';
import { UpdatePaymentVoucherDto } from './dto/update-voucher.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { serializeDecimals } from '../common/utils/format.utils';

@Injectable()
export class PaymentVouchersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePaymentVoucherDto) {
    return serializeDecimals(
      await this.prisma.paymentVoucher.create({
        data: this.toRow(dto),
        include: { internalAccount: { include: { bank: true } } },
      }),
    );
  }

  async findAll(query: PaymentVoucherQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where: any = {};
    if (query.category) where.category = query.category;
    if (query.payableType) where.payableType = query.payableType;

    if (search) {
      where.OR = [
        { pvNumber: { contains: search, mode: 'insensitive' as const } },
        { payableNameManual: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.paymentVoucher.findMany({
        where,
        skip,
        take: limit,
        include: { internalAccount: { include: { bank: true } } },
        orderBy: [{ issuingDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.paymentVoucher.count({ where }),
    ]);

    return {
      data: serializeDecimals(data),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const pv = await this.prisma.paymentVoucher.findUnique({
      where: { id: BigInt(id) },
      include: { internalAccount: { include: { bank: true } }, receiveVouchers: true },
    });

    if (!pv) throw new NotFoundException(`Payment Voucher with ID ${id} not found`);

    return serializeDecimals(pv);
  }

  async update(id: number, dto: UpdatePaymentVoucherDto) {
    await this.findOne(id);

    return serializeDecimals(
      await this.prisma.paymentVoucher.update({
        where: { id: BigInt(id) },
        data: this.toRow(dto),
        include: { internalAccount: { include: { bank: true } } },
      }),
    );
  }

  async remove(id: number) {
    await this.findOne(id);
    return serializeDecimals(await this.prisma.paymentVoucher.delete({ where: { id: BigInt(id) } }));
  }

  private toRow(data: any) {
    const row: any = { ...data };

    for (const field of ['issuingDate', 'dueDate', 'paymentDate']) {
      if (data[field] !== undefined) row[field] = data[field] ? new Date(data[field]) : null;
    }
    for (const field of ['payableId', 'purchaseOrderId', 'internalAccountId']) {
      if (data[field] !== undefined) row[field] = data[field] ? BigInt(data[field]) : null;
    }

    return row;
  }
}
