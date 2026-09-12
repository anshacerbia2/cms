import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { serializeDecimals } from '../common/utils/format.utils';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto) {
    const { customerId, value, startDate, endDate, dueDate, ...rest } = createProjectDto;

    this.validateDates(startDate, endDate, dueDate);
    await this.assertCustomerExists(customerId);

    const code = await this.generateUniqueCode();

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          ...rest,
          code,
          value,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          dueDate: new Date(dueDate),
          customerId: BigInt(customerId),
        },
        include: { customer: true },
      });

      // FIT projects skip the proposal step, so their sales code is issued up front.
      if (project.type === 'FIT') {
        return serializeDecimals(
          await tx.project.update({
            where: { id: project.id },
            data: { salesCode: await this.generateSalesCode(tx, project.id, project.code) },
            include: { customer: true },
          }),
        );
      }

      return serializeDecimals(project);
    });
  }

  async findAll(query: PaginationQueryDto & { customerId?: number; status?: string; type?: string }): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where: any = { deletedAt: null };

    if (query.customerId) where.customerId = BigInt(query.customerId);
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' as const } },
        { name: { contains: search, mode: 'insensitive' as const } },
        { refDocNo: { contains: search, mode: 'insensitive' as const } },
        { salesCode: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
        { customer: { name: { contains: search, mode: 'insensitive' as const } } },
        { proposals: { some: { code: { contains: search, mode: 'insensitive' as const } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          _count: { select: { proposals: true, invoices: true, salesItems: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: serializeDecimals(data),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    return serializeDecimals(await this.findOneRaw(id));
  }

  /** Raw entity (Decimal/Date instances intact) for internal business rules. */
  private async findOneRaw(id: number) {
    const project = await this.prisma.project.findFirst({
      where: { id: BigInt(id), deletedAt: null },
      include: {
        customer: { include: { billingOptions: true } },
        proposals: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        salesItems: { include: { product: true } },
        invoices: {
          include: {
            internalAccount: { include: { bank: true } },
            salesItems: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;

  }

  async update(id: number, updateProjectDto: UpdateProjectDto) {
    const existing = await this.findOneRaw(id);
    const { customerId, startDate, endDate, dueDate, type, ...rest } = updateProjectDto;

    this.validateDates(
      startDate ?? existing.startDate.toISOString(),
      endDate ?? existing.endDate.toISOString(),
      dueDate ?? existing.dueDate.toISOString(),
    );

    if (customerId !== undefined) await this.assertCustomerExists(customerId);

    const data: any = { ...rest };
    if (customerId !== undefined) data.customerId = BigInt(customerId);
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);
    if (dueDate) data.dueDate = new Date(dueDate);

    return this.prisma.$transaction(async (tx) => {
      if (type && type !== existing.type) {
        if (type === 'FIT') {
          // FIT projects bill directly, so they must not carry proposals.
          if (existing.proposals.length > 0) {
            throw new BadRequestException(
              'Cannot change Project Type to FIT because it has existing Proposals. FIT projects cannot have proposals.',
            );
          }
          data.salesCode = await this.generateSalesCode(tx, existing.id, existing.code);
        }

        if (type === 'REGULAR') {
          if (existing.invoices.length > 0) {
            throw new BadRequestException(
              'Cannot change Project Type to Regular because it has existing Invoices. Regular projects cannot have invoices.',
            );
          }
          data.salesCode = null;
        }

        data.type = type;
      }

      return serializeDecimals(
        await tx.project.update({
          where: { id: BigInt(id) },
          data,
          include: { customer: true },
        }),
      );
    });
  }

  async remove(id: number) {
    await this.findOneRaw(id);
    const projectId = BigInt(id);

    // Deleting the project is a soft delete, so its proposals and invoices would
    // survive and stay reachable while their parent has vanished from every
    // listing — an invoice with money collected against a project nobody can
    // find. Invoice deletion already refuses while a receive voucher is attached
    // and a WIN proposal refuses outright, so the chain only holds if this end
    // checks too.
    const [proposals, invoices] = await Promise.all([
      this.prisma.proposal.count({ where: { projectId, deletedAt: null } }),
      this.prisma.invoice.count({ where: { projectId } }),
    ]);

    if (proposals > 0 || invoices > 0) {
      const blockers = [
        proposals > 0 ? `${proposals} proposal(s)` : null,
        invoices > 0 ? `${invoices} invoice(s)` : null,
      ].filter(Boolean);

      throw new BadRequestException(
        `This project still has ${blockers.join(' and ')}. Delete those first.`,
      );
    }

    return serializeDecimals(
      await this.prisma.project.update({
        where: { id: projectId },
        data: { deletedAt: new Date() },
      }),
    );
  }

  private validateDates(startDate: string | Date, endDate: string | Date, dueDate: string | Date) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const due = new Date(dueDate);

    if (end <= start) {
      throw new BadRequestException('End date must be after start date');
    }
    if (due < start || due > end) {
      throw new BadRequestException('Due date must fall between start date and end date');
    }
  }

  private async assertCustomerExists(customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: BigInt(customerId), deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }
  }

  private async generateUniqueCode(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (;;) {
      const random = Math.random().toString(36).substring(2, 7).toUpperCase().padEnd(5, '0');
      const code = `PRJ-${dateStr}-${random}`;
      const found = await this.prisma.project.findUnique({ where: { code } });
      if (!found) return code;
    }
  }

  /**
   * FIT sales code: FIT-{last 5 of project code}-{YYYYMMDD}-{3 digit sequence}.
   * The sequence continues from the project's latest invoice code so a re-issued
   * sales code never collides with an invoice that is already out.
   */
  private async generateSalesCode(tx: any, projectId: bigint, projectCode: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const projCodeLast5 = (projectCode ?? String(projectId)).slice(-5).padStart(5, '0');

    const latestInvoice = await tx.invoice.findFirst({
      where: { projectId },
      orderBy: { id: 'desc' },
    });

    const match = latestInvoice?.code?.match(/-(\d{3})$/);
    let sequence = match ? parseInt(match[1], 10) + 1 : 1;

    for (;;) {
      const candidate = `FIT-${projCodeLast5}-${dateStr}-${String(sequence).padStart(3, '0')}`;

      const [invoiceClash, projectClash] = await Promise.all([
        tx.invoice.findUnique({ where: { code: candidate } }),
        tx.project.findFirst({ where: { salesCode: candidate, id: { not: projectId } } }),
      ]);

      if (!invoiceClash && !projectClash) return candidate;
      sequence++;
    }
  }
}
