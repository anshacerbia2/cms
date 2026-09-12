import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

const ROLE_DETAIL_INCLUDE = {
  permissions: { include: { permission: true } },
  menus: { include: { menu: true } },
  _count: { select: { users: true } },
} as const;

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRoleDto) {
    const { permissionIds, menuIds, ...roleData } = dto;

    await this.assertSlugFree(roleData.slug);
    await this.assertReferencesExist(permissionIds, menuIds);

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({ data: roleData });

      if (permissionIds?.length) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId: BigInt(permissionId),
          })),
        });
      }

      if (menuIds?.length) {
        await tx.roleMenu.createMany({
          data: menuIds.map((menuId) => ({ roleId: role.id, menuId: BigInt(menuId) })),
        });
      }

      return tx.role.findUnique({ where: { id: role.id }, include: ROLE_DETAIL_INCLUDE });
    });
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        include: { _count: { select: { users: true, permissions: true, menus: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.role.count({ where }),
    ]);

    return { data, meta: { total, page, limit, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: BigInt(id) },
      include: ROLE_DETAIL_INCLUDE,
    });

    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
    return role;
  }

  async update(id: number, dto: UpdateRoleDto) {
    const { permissionIds, menuIds, ...roleData } = dto;
    const roleId = BigInt(id);

    await this.findOne(id);
    if (roleData.slug) await this.assertSlugFree(roleData.slug, roleId);
    await this.assertReferencesExist(permissionIds, menuIds);

    return this.prisma.$transaction(async (tx) => {
      await tx.role.update({ where: { id: roleId }, data: roleData });

      // Both lists are absolute. `undefined` means "not being edited"; an empty
      // array means "revoke everything", so the two cases must stay distinct.
      if (permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId } });
        if (permissionIds.length) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
              roleId,
              permissionId: BigInt(permissionId),
            })),
          });
        }
      }

      if (menuIds) {
        await tx.roleMenu.deleteMany({ where: { roleId } });
        if (menuIds.length) {
          await tx.roleMenu.createMany({
            data: menuIds.map((menuId) => ({ roleId, menuId: BigInt(menuId) })),
          });
        }
      }

      return tx.role.findUnique({ where: { id: roleId }, include: ROLE_DETAIL_INCLUDE });
    });
  }

  async remove(id: number) {
    const role = await this.findOne(id);

    // users.role_id is ON DELETE SET NULL, so deleting a role in use would
    // silently strip those accounts of every permission instead of failing.
    if (role._count.users > 0) {
      throw new BadRequestException(
        `Role "${role.name}" is still assigned to ${role._count.users} user(s). Reassign them first.`,
      );
    }

    return this.prisma.role.delete({ where: { id: BigInt(id) } });
  }

  private async assertSlugFree(slug: string, exceptId?: bigint) {
    const existing = await this.prisma.role.findUnique({ where: { slug } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Role slug "${slug}" is already taken.`);
    }
  }

  /**
   * createMany would fail on a bad id with a raw foreign-key error, which reaches
   * the client as a 500. Checking up front turns it into a usable message.
   */
  private async assertReferencesExist(permissionIds?: number[], menuIds?: number[]) {
    if (permissionIds?.length) {
      const found = await this.prisma.permission.count({
        where: { id: { in: permissionIds.map(BigInt) } },
      });
      if (found !== permissionIds.length) {
        throw new BadRequestException('One or more permission IDs do not exist.');
      }
    }

    if (menuIds?.length) {
      const found = await this.prisma.menu.count({ where: { id: { in: menuIds.map(BigInt) } } });
      if (found !== menuIds.length) {
        throw new BadRequestException('One or more menu IDs do not exist.');
      }
    }
  }
}
