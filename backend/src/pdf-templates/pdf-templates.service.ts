import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePdfTemplateDto, PdfTemplateTypeDto } from './dto/create-pdf-template.dto';
import { UpdatePdfTemplateDto } from './dto/update-pdf-template.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { renderTemplate, extractVariables, toPrintablePage } from './template-renderer';

@Injectable()
export class PdfTemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePdfTemplateDto) {
    await this.assertNameFree(dto.name);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isActive !== false) await this.deactivateOthers(tx, dto.type);

      return tx.pdfTemplate.create({
        // Cast because Prisma types Json input as a plain JSON value, while the
        // DTO carries a validated class instance of the same shape.
        data: { ...dto, variables: (dto.variables ?? undefined) as any },
      });
    });
  }

  async findAll(query: PaginationQueryDto & { type?: string }): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where: any = {
      ...(query.type ? { type: query.type as any } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.pdfTemplate.findMany({
        where,
        skip,
        take: limit,
        // html_content can be tens of kilobytes; the list never shows it.
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          isActive: true,
          variables: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.pdfTemplate.count({ where }),
    ]);

    return { data, meta: { total, page, limit, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number) {
    const template = await this.prisma.pdfTemplate.findUnique({ where: { id: BigInt(id) } });
    if (!template) throw new NotFoundException(`PDF template with ID ${id} not found`);
    return template;
  }

  async update(id: number, dto: UpdatePdfTemplateDto) {
    const existing = await this.findOne(id);
    if (dto.name) await this.assertNameFree(dto.name, BigInt(id));

    return this.prisma.$transaction(async (tx) => {
      if (dto.isActive) await this.deactivateOthers(tx, dto.type ?? (existing.type as any), BigInt(id));

      return tx.pdfTemplate.update({
        where: { id: BigInt(id) },
        data: { ...dto, variables: (dto.variables ?? undefined) as any },
      });
    });
  }

  async remove(id: number) {
    const template = await this.findOne(id);

    // Printing falls back to nothing without an active template, so the last one
    // standing cannot be removed by accident.
    if (template.isActive) {
      const remaining = await this.prisma.pdfTemplate.count({
        where: { type: template.type, id: { not: BigInt(id) } },
      });
      if (remaining === 0) {
        throw new BadRequestException(
          `"${template.name}" is the only ${template.type.toLowerCase()} template. Create a replacement before deleting it.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.pdfTemplate.delete({ where: { id: BigInt(id) } });

      // Removing the active one would leave the type with nothing to print from,
      // so the most recently updated survivor takes over.
      if (template.isActive) {
        const successor = await tx.pdfTemplate.findFirst({
          where: { type: template.type },
          orderBy: { updatedAt: 'desc' },
        });
        if (successor) {
          await tx.pdfTemplate.update({
            where: { id: successor.id },
            data: { isActive: true },
          });
        }
      }

      return deleted;
    });
  }

  /** The template used when printing; there is at most one active per type. */
  async findActive(type: PdfTemplateTypeDto) {
    return this.prisma.pdfTemplate.findFirst({
      where: { type: type as any, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Renders arbitrary markup against sample data, for the editor's preview pane. */
  preview(htmlContent: string, data: Record<string, string> = {}) {
    const variables = extractVariables(htmlContent);
    const filled = Object.fromEntries(
      variables.map((name) => [name, data[name] ?? `[${name}]`]),
    );

    return {
      variables,
      html: toPrintablePage(renderTemplate(htmlContent, filled), 'Template Preview', false),
    };
  }

  private async assertNameFree(name: string, exceptId?: bigint) {
    const existing = await this.prisma.pdfTemplate.findUnique({ where: { name } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`A template named "${name}" already exists.`);
    }
  }

  /**
   * Exactly one template per type is active. Without this, two actives would make
   * the one that prints depend on row order rather than on an explicit choice.
   */
  private async deactivateOthers(tx: any, type: string, exceptId?: bigint) {
    await tx.pdfTemplate.updateMany({
      where: { type: type as any, isActive: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
      data: { isActive: false },
    });
  }
}
