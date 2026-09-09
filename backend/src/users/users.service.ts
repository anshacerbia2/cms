import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/** Matches the cost factor the auth seeder and login path already use. */
const BCRYPT_ROUNDS = 10;

/** Every field of `users` except `password` and `remember_token`. */
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  emailVerifiedAt: true,
  phone: true,
  location: true,
  status: true,
  roleId: true,
  createdAt: true,
  updatedAt: true,
  role: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: SAFE_USER_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { 
        role: { 
          include: { 
            permissions: { include: { permission: true } },
            menus: { 
              include: { 
                menu: { 
                  include: { 
                    permission: true 
                  } 
                } 
              } 
            } 
          } 
        } 
      },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: { 
        role: { 
          include: { 
            permissions: { include: { permission: true } },
            menus: { 
              include: { 
                menu: { 
                  include: { 
                    permission: true 
                  } 
                } 
              } 
            } 
          } 
        } 
      },
    });
  }

  async create(dto: CreateUserDto) {
    const { password, roleId, ...userData } = dto;

    await this.assertEmailFree(dto.email);
    await this.assertRoleExists(roleId);

    return this.prisma.user.create({
      data: {
        ...userData,
        password: await bcrypt.hash(password, BCRYPT_ROUNDS),
        ...(roleId !== undefined ? { roleId: BigInt(roleId) } : {}),
      },
      select: SAFE_USER_SELECT,
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(id) },
      select: SAFE_USER_SELECT,
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    const { roleId, ...userData } = dto;

    await this.findOne(id);
    if (dto.email) await this.assertEmailFree(dto.email, BigInt(id));
    await this.assertRoleExists(roleId);

    return this.prisma.user.update({
      where: { id: BigInt(id) },
      data: {
        ...userData,
        ...(roleId !== undefined ? { roleId: roleId === null ? null : BigInt(roleId) } : {}),
      },
      select: SAFE_USER_SELECT,
    });
  }

  async changePassword(id: number, password: string) {
    await this.findOne(id);

    await this.prisma.user.update({
      where: { id: BigInt(id) },
      data: { password: await bcrypt.hash(password, BCRYPT_ROUNDS) },
    });

    return { message: 'Password updated successfully' };
  }

  async remove(id: number, requesterId?: string) {
    const user = await this.findOne(id);

    // Deleting the account you are signed in as leaves a valid token pointing at
    // a row that no longer exists, and locks you out mid-session.
    if (requesterId && requesterId === user.id.toString()) {
      throw new BadRequestException('You cannot delete the account you are signed in as.');
    }

    return this.prisma.user.delete({ where: { id: BigInt(id) }, select: SAFE_USER_SELECT });
  }

  private async assertEmailFree(email: string, exceptId?: bigint) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Email "${email}" is already registered.`);
    }
  }

  private async assertRoleExists(roleId?: number | null) {
    if (roleId === undefined || roleId === null) return;

    const role = await this.prisma.role.findUnique({ where: { id: BigInt(roleId) } });
    if (!role) throw new BadRequestException(`Role ${roleId} does not exist.`);
  }
}
