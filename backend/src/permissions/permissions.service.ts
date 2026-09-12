import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePermissionDto) {
    await this.assertRouteFree(dto.route);
    return this.prisma.permission.create({ data: dto });
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where = search
      ? {
          OR: [
            { route: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip,
        take: limit,
        include: { _count: { select: { roles: true, menus: true } } },
        orderBy: { route: 'asc' },
      }),
      this.prisma.permission.count({ where }),
    ]);

    return { data, meta: { total, page, limit, lastPage: Math.ceil(total / limit) } };
  }

  /**
   * The whole list, unpaginated — the role editor renders every permission as a
   * checkbox matrix and has no way to page through it.
   */
  async findAllGrouped() {
    const permissions = await this.prisma.permission.findMany({ orderBy: { route: 'asc' } });

    const groups = new Map<string, typeof permissions>();
    for (const permission of permissions) {
      const [module] = permission.route.split('.');
      const bucket = groups.get(module) ?? [];
      bucket.push(permission);
      groups.set(module, bucket);
    }

    return [...groups.entries()].map(([module, items]) => ({ module, permissions: items }));
  }

  async findOne(id: number) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: BigInt(id) },
      include: { roles: { include: { role: true } } },
    });

    if (!permission) throw new NotFoundException(`Permission with ID ${id} not found`);
    return permission;
  }

  async update(id: number, dto: UpdatePermissionDto) {
    await this.findOne(id);
    if (dto.route) await this.assertRouteFree(dto.route, BigInt(id));

    return this.prisma.permission.update({ where: { id: BigInt(id) }, data: dto });
  }

  async remove(id: number) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: BigInt(id) },
      include: { _count: { select: { menus: true } } },
    });

    if (!permission) throw new NotFoundException(`Permission with ID ${id} not found`);

    // menus.permission_id is ON DELETE SET NULL: the menu would survive with no
    // route to derive a URL from, leaving a dead sidebar entry behind.
    if (permission._count.menus > 0) {
      throw new BadRequestException(
        `Permission "${permission.route}" is still linked to ${permission._count.menus} menu(s). Unlink them first.`,
      );
    }

    return this.prisma.permission.delete({ where: { id: BigInt(id) } });
  }

  private async assertRouteFree(route: string, exceptId?: bigint) {
    const existing = await this.prisma.permission.findUnique({ where: { route } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Permission route "${route}" already exists.`);
    }
  }
}
