import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, QueryUserDto, UpdateUserDto } from './dto/user.dto';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';
import { normalizePrismaCount } from 'src/utils/pagination-total.util';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────
  // GET ALL (Pagination + Datatable)
  // ──────────────────────────────────────────
  async findAll(query: QueryUserDto) {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 10;
    const skip = (page - 1) * perPage;
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'desc';

    try {
      const where = {
        deleted_at: null,
        ...(query.role_id && { role_id: BigInt(query.role_id) }),
        ...(query.status && { status: query.status }),
        ...(query.search && {
          OR: [
            { username: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [data, totalRaw] = await this.prisma.db.$transaction([
        this.prisma.db.user.findMany({
          where,
          skip,
          take: perPage,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            users_uuid: true,
            username: true,
            email: true,
            status: true,
            role_id: true,
            role: {
              select: { id: true, name: true },
            },
            created_at: true,
            updated_at: true,
          },
        }),
        this.prisma.db.user.count({ where }),
      ]);

      const total = normalizePrismaCount(totalRaw as number | bigint);

      return {
        success: true,
        message: 'Data user berhasil diambil',
        data: data.map((u) => ({
          ...u,
          id: u.id.toString(),
          role_id: u.role_id?.toString() ?? null,
          role: u.role ? { ...u.role, id: u.role.id.toString() } : null,
        })),
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      };
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  // ──────────────────────────────────────────
  // GET ONE
  // ──────────────────────────────────────────
  async findOne(uuid: string) {
    try {
      const user = await this.prisma.db.user.findFirst({
        where: { users_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          users_uuid: true,
          username: true,
          email: true,
          status: true,
          role_id: true,
          role: {
            select: { id: true, name: true, description: true },
          },
          created_by: true,
          updated_by: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!user) {
        throw new NotFoundException({
          success: false,
          message: `User dengan UUID ${uuid} tidak ditemukan`,
        });
      }

      return {
        success: true,
        message: 'Data user berhasil diambil',
        data: {
          ...user,
          id: user.id.toString(),
          role_id: user.role_id?.toString() ?? null,
          created_by: user.created_by?.toString() ?? null,
          updated_by: user.updated_by?.toString() ?? null,
          role: user.role ? { ...user.role, id: user.role.id.toString() } : null,
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  // ──────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────
  async create(dto: CreateUserDto, user: CurrentUserType) {
    try {
      // Cek email duplikat
      const emailExists = await this.prisma.db.user.findFirst({
        where: { email: dto.email, deleted_at: null },
      });
      if (emailExists) {
        throw new ConflictException({
          success: false,
          message: `Email "${dto.email}" sudah digunakan`,
        });
      }

      // Cek username duplikat
      const usernameExists = await this.prisma.db.user.findFirst({
        where: { username: dto.username, deleted_at: null },
      });
      if (usernameExists) {
        throw new ConflictException({
          success: false,
          message: `Username "${dto.username}" sudah digunakan`,
        });
      }

      // Validasi role_id jika diberikan
      if (dto.role_id) {
        const role = await this.prisma.db.role.findFirst({
          where: { id: BigInt(dto.role_id), deleted_at: null },
        });
        if (!role) {
          throw new NotFoundException({
            success: false,
            message: `Role dengan ID ${dto.role_id} tidak ditemukan`,
          });
        }
      }

      const userId = normalizeUserId(user.id);
      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const created = await this.prisma.db.user.create({
        data: {
          role_id: dto.role_id ? BigInt(dto.role_id) : undefined,
          email: dto.email,
          password: hashedPassword,
          username: dto.username,
          status: dto.status,
          created_by: userId,
        },
      });

      return {
        success: true,
        message: 'User berhasil dibuat',
        data: {
          id: created.id.toString(),
          users_uuid: created.users_uuid,
          username: created.username,
          email: created.email,
          role_id: created.role_id?.toString() ?? null,
          status: created.status,
          created_at: created.created_at,
          updated_at: created.updated_at,
        },
      };
    } catch (error: unknown) {
      if (error instanceof ConflictException || error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
  async update(id: number, dto: UpdateUserDto, user: CurrentUserType) {
    try {
      const existing = await this.prisma.db.user.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!existing) {
        throw new NotFoundException({
          success: false,
          message: `User dengan ID ${id} tidak ditemukan`,
        });
      }

      // Cek email duplikat (kecuali user ini sendiri)
      if (dto.email && dto.email !== existing.email) {
        const emailExists = await this.prisma.db.user.findFirst({
          where: { email: dto.email, deleted_at: null, NOT: { id: BigInt(id) } },
        });
        if (emailExists) {
          throw new ConflictException({
            success: false,
            message: `Email "${dto.email}" sudah digunakan`,
          });
        }
      }

      // Cek username duplikat (kecuali user ini sendiri)
      if (dto.username && dto.username !== existing.username) {
        const usernameExists = await this.prisma.db.user.findFirst({
          where: { username: dto.username, deleted_at: null, NOT: { id: BigInt(id) } },
        });
        if (usernameExists) {
          throw new ConflictException({
            success: false,
            message: `Username "${dto.username}" sudah digunakan`,
          });
        }
      }

      // Validasi role_id jika diubah
      if (dto.role_id) {
        const role = await this.prisma.db.role.findFirst({
          where: { id: BigInt(dto.role_id), deleted_at: null },
        });
        if (!role) {
          throw new NotFoundException({
            success: false,
            message: `Role dengan ID ${dto.role_id} tidak ditemukan`,
          });
        }
      }

      const userId = normalizeUserId(user.id);
      const hashedPassword = dto.password
        ? await bcrypt.hash(dto.password, 10)
        : undefined;

      const updated = await this.prisma.db.user.update({
        where: { id: BigInt(id) },
        data: {
          role_id: dto.role_id !== undefined ? (dto.role_id ? BigInt(dto.role_id) : null) : undefined,
          ...(dto.email !== undefined && { email: dto.email }),
          ...(hashedPassword && { password: hashedPassword }),
          ...(dto.username !== undefined && { username: dto.username }),
          ...(dto.status !== undefined && { status: dto.status }),
          updated_by: userId,
        },
      });

      return {
        success: true,
        message: 'User berhasil diperbarui',
        data: {
          id: updated.id.toString(),
          users_uuid: updated.users_uuid,
          username: updated.username,
          email: updated.email,
          role_id: updated.role_id?.toString() ?? null,
          status: updated.status,
          updated_at: updated.updated_at,
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      return this.handleError(error);
    }
  }

  // ──────────────────────────────────────────
  // SOFT DELETE
  // ──────────────────────────────────────────
  async remove(id: number, user: CurrentUserType) {
    try {
      const existing = await this.prisma.db.user.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!existing) {
        throw new NotFoundException({
          success: false,
          message: `User dengan ID ${id} tidak ditemukan atau sudah dihapus`,
        });
      }

      const userId = normalizeUserId(user.id);

      await this.prisma.db.user.update({
        where: { id: BigInt(id) },
        data: {
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });

      return {
        success: true,
        message: `User "${existing.username}" berhasil dihapus`,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  // ──────────────────────────────────────────
  // HELPER: Error Handler
  // ──────────────────────────────────────────
  private handleError(error: unknown) {
    if (error instanceof Array) {
      return { success: false, message: 'Validation failed', errors: error };
    }
    if (error instanceof Error) {
      return { success: false, message: 'Operation failed', error: error.message };
    }
    return { success: false, message: 'Operation failed', error: 'Unknown error' };
  }
}