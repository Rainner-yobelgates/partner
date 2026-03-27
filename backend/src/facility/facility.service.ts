import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFacilityDto, QueryFacilityDto, UpdateFacilityDto } from './dto/facility.dto';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';
import { Status } from 'generated/prisma/enums';

@Injectable()
export class FacilityService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────
  // GET ALL (Pagination + Datatable)
  // ──────────────────────────────────────────
  async findAll(query: QueryFacilityDto) {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 10;
    const skip = (page - 1) * perPage;
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'desc';

    try {
      const where = {
        deleted_at: null,
        ...(query.status && { status: query.status }),
        ...(query.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { description: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [data, total] = await this.prisma.db.$transaction([
        this.prisma.db.facility.findMany({
          where,
          skip,
          take: perPage,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            facilities_uuid: true,
            name: true,
            cost: true,
            description: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        }),
        this.prisma.db.facility.count({ where }),
      ]);

      return {
        success: true,
        message: 'Data fasilitas berhasil diambil',
        data: data.map((f) => ({
          ...f,
          id: f.id.toString(),
          cost: f.cost ? Number(f.cost) : null,
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
      const facility = await this.prisma.db.facility.findFirst({
        where: { facilities_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          facilities_uuid: true,
          name: true,
          cost: true,
          description: true,
          status: true,
          created_by: true,
          updated_by: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!facility) {
        throw new NotFoundException({
          success: false,
          message: `Fasilitas dengan UUID ${uuid} tidak ditemukan`,
        });
      }

      return {
        success: true,
        message: 'Data fasilitas berhasil diambil',
        data: {
          ...facility,
          id: facility.id.toString(),
          cost: facility.cost ? Number(facility.cost) : null,
          created_by: facility.created_by?.toString() ?? null,
          updated_by: facility.updated_by?.toString() ?? null,
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
  async create(dto: CreateFacilityDto, user: CurrentUserType) {
    try {
      const name = dto.name.trim();

      // Cek nama duplikat (case-sensitive)
      const exists = await this.prisma.db.facility.findFirst({
        where: { name, deleted_at: null },
      });
      if (exists) {
        throw new ConflictException({
          success: false,
          message: `Fasilitas dengan nama "${name}" sudah terdaftar`,
        });
      }

      const userId = normalizeUserId(user.id);

      const facility = await this.prisma.db.facility.create({
        data: {
          name,
          cost: dto.cost,
          description: dto.description,
          status: dto.status ?? Status.ACTIVE,
          created_by: userId,
        },
      });

      return {
        success: true,
        message: 'Fasilitas berhasil dibuat',
        data: {
          ...facility,
          id: facility.id.toString(),
          cost: facility.cost ? Number(facility.cost) : null,
        },
      };
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      return this.handleError(error);
    }
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
  async update(id: number, dto: UpdateFacilityDto, user: CurrentUserType) {
    try {
      const facility = await this.prisma.db.facility.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!facility) {
        throw new NotFoundException({
          success: false,
          message: `Fasilitas dengan ID ${id} tidak ditemukan`,
        });
      }

      // Cek nama duplikat (kecuali fasilitas ini sendiri)
      if (dto.name) {
        const name = dto.name.trim();
        if (name !== facility.name) {
        const exists = await this.prisma.db.facility.findFirst({
          where: {
            name,
            deleted_at: null,
            NOT: { id: BigInt(id) },
          },
        });
        if (exists) {
          throw new ConflictException({
            success: false,
            message: `Fasilitas dengan nama "${name}" sudah terdaftar`,
          });
        }
        }
      }

      const userId = normalizeUserId(user.id);

      const updated = await this.prisma.db.facility.update({
        where: { id: BigInt(id) },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.cost !== undefined && { cost: dto.cost }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.status !== undefined && { status: dto.status }),
          updated_by: userId,
        },
      });

      return {
        success: true,
        message: 'Fasilitas berhasil diperbarui',
        data: {
          ...updated,
          id: updated.id.toString(),
          cost: updated.cost ? Number(updated.cost) : null,
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
      const facility = await this.prisma.db.facility.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!facility) {
        throw new NotFoundException({
          success: false,
          message: `Fasilitas dengan ID ${id} tidak ditemukan atau sudah dihapus`,
        });
      }

      const userId = normalizeUserId(user.id);

      await this.prisma.db.facility.update({
        where: { id: BigInt(id) },
        data: {
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });

      return {
        success: true,
        message: `Fasilitas "${facility.name}" berhasil dihapus`,
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
