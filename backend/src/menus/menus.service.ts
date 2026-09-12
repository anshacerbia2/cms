import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenusService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMenuDto) {
    await this.assertReferencesExist(dto.parentId, dto.permissionId);

    const { parentId, permissionId, ...rest } = dto;

    return this.prisma.menu.create({
      data: { ...rest, ...this.toForeignKeys(parentId, permissionId) },
      include: { permission: true },
    });
  }

  /**
   * Returns the whole tree rather than a page: the sidebar and the menu editor
   * both need every node at once to render nesting correctly.
   */
  async findAll() {
    const menus = await this.prisma.menu.findMany({
      include: { permission: true, _count: { select: { roles: true } } },
      orderBy: [{ parentId: 'asc' }, { orderIndex: 'asc' }],
    });

    const byId = new Map(menus.map((m) => [m.id.toString(), { ...m, children: [] as any[] }]));
    const roots: any[] = [];

    for (const node of byId.values()) {
      const parent = node.parentId ? byId.get(node.parentId.toString()) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    return roots;
  }

  async findOne(id: number) {
    const menu = await this.prisma.menu.findUnique({
      where: { id: BigInt(id) },
      include: { permission: true, parent: true, children: true },
    });

    if (!menu) throw new NotFoundException(`Menu with ID ${id} not found`);
    return menu;
  }

  async update(id: number, dto: UpdateMenuDto) {
    await this.findOne(id);
    await this.assertReferencesExist(dto.parentId, dto.permissionId);

    if (dto.parentId !== undefined && dto.parentId !== null) {
      await this.assertNotOwnDescendant(BigInt(id), BigInt(dto.parentId));
    }

    const { parentId, permissionId, ...rest } = dto;

    return this.prisma.menu.update({
      where: { id: BigInt(id) },
      data: { ...rest, ...this.toForeignKeys(parentId, permissionId) },
      include: { permission: true },
    });
  }

  async remove(id: number) {
    const menu = await this.findOne(id);

    // menus.parent_id is ON DELETE SET NULL, so deleting a parent would promote
    // its children to top level instead of removing them — never what was meant.
    if (menu.children.length > 0) {
      throw new BadRequestException(
        `Menu "${menu.name}" still has ${menu.children.length} child menu(s). Remove or move them first.`,
      );
    }

    return this.prisma.menu.delete({ where: { id: BigInt(id) } });
  }

  /**
   * An omitted key means "leave as is"; an explicit null means "detach". Folding
   * the two together would make it impossible to unlink a parent or permission.
   */
  private toForeignKeys(parentId?: number | null, permissionId?: number | null) {
    return {
      ...(parentId !== undefined ? { parentId: parentId === null ? null : BigInt(parentId) } : {}),
      ...(permissionId !== undefined
        ? { permissionId: permissionId === null ? null : BigInt(permissionId) }
        : {}),
    };
  }

  private async assertReferencesExist(parentId?: number, permissionId?: number) {
    if (parentId) {
      const parent = await this.prisma.menu.findUnique({ where: { id: BigInt(parentId) } });
      if (!parent) throw new BadRequestException(`Parent menu ${parentId} does not exist.`);
    }

    if (permissionId) {
      const permission = await this.prisma.permission.findUnique({
        where: { id: BigInt(permissionId) },
      });
      if (!permission) throw new BadRequestException(`Permission ${permissionId} does not exist.`);
    }
  }

  /**
   * Reparenting a node under its own descendant would detach that whole subtree
   * from every root, making it unreachable from the sidebar and unfixable in the UI.
   */
  private async assertNotOwnDescendant(menuId: bigint, newParentId: bigint) {
    if (menuId === newParentId) {
      throw new BadRequestException('A menu cannot be its own parent.');
    }

    let cursor: bigint | null = newParentId;
    const seen = new Set<string>();

    while (cursor) {
      if (cursor === menuId) {
        throw new BadRequestException('A menu cannot be moved under one of its own children.');
      }
      if (seen.has(cursor.toString())) break;
      seen.add(cursor.toString());

      const parent: { parentId: bigint | null } | null = await this.prisma.menu.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = parent?.parentId ?? null;
    }
  }
}
