import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto, QueryVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';

@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────
  // GET ALL (Pagination + Datatable)
  // ──────────────────────────────────────────
  async findAll(query: QueryVehicleDto) {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 10;
    const skip = (page - 1) * perPage;
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'desc';

    try {
      const where = {
        deleted_at: null,
        ...(query.vehicle_type && { vehicle_type: query.vehicle_type }),
        ...(query.status && { status: query.status }),
        ...(query.search && {
          OR: [
            { plate_number: { contains: query.search, mode: 'insensitive' as const } },
            { hull_number: { contains: query.search, mode: 'insensitive' as const } },
            { brand: { contains: query.search, mode: 'insensitive' as const } },
            { model: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [data, total] = await this.prisma.db.$transaction([
        this.prisma.db.vehicle.findMany({
          where,
          skip,
          take: perPage,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            vehicles_uuid: true,
            plate_number: true,
            hull_number: true,
            vehicle_type: true,
            brand: true,
            model: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        }),
        this.prisma.db.vehicle.count({ where }),
      ]);

      return {
        success: true,
        message: 'Data kendaraan berhasil diambil',
        data: data.map((v) => ({ ...v, id: v.id.toString() })),
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
      const vehicle = await this.prisma.db.vehicle.findFirst({
        where: { vehicles_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          vehicles_uuid: true,
          plate_number: true,
          hull_number: true,
          vehicle_type: true,
          brand: true,
          model: true,
          status: true,
          created_by: true,
          updated_by: true,
          created_at: true,
          updated_at: true,
          drivers: {
            where: { deleted_at: null },
            select: {
              id: true,
              drivers_uuid: true,
              name: true,
              phone_number: true,
              type: true,
              status: true,
            },
          },
        },
      });

      if (!vehicle) {
        throw new NotFoundException({
          success: false,
          message: `Kendaraan dengan UUID ${uuid} tidak ditemukan`,
        });
      }

      return {
        success: true,
        message: 'Data kendaraan berhasil diambil',
        data: {
          ...vehicle,
          id: vehicle.id.toString(),
          created_by: vehicle.created_by?.toString() ?? null,
          updated_by: vehicle.updated_by?.toString() ?? null,
          drivers: vehicle.drivers.map((d) => ({ ...d, id: d.id.toString() })),
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
  async create(dto: CreateVehicleDto, user: CurrentUserType) {
    try {
      // Cek plate_number duplikat jika diberikan
      if (dto.plate_number) {
        const exists = await this.prisma.db.vehicle.findFirst({
          where: { plate_number: dto.plate_number, deleted_at: null },
        });
        if (exists) {
          throw new ConflictException({
            success: false,
            message: `Kendaraan dengan plat nomor "${dto.plate_number}" sudah terdaftar`,
          });
        }
      }

      // Cek hull_number duplikat jika diberikan
      if (dto.hull_number) {
        const exists = await this.prisma.db.vehicle.findFirst({
          where: { hull_number: dto.hull_number, deleted_at: null },
        });
        if (exists) {
          throw new ConflictException({
            success: false,
            message: `Kendaraan dengan nomor rangka "${dto.hull_number}" sudah terdaftar`,
          });
        }
      }

      const userId = normalizeUserId(user.id);

      const vehicle = await this.prisma.db.vehicle.create({
        data: {
          plate_number: dto.plate_number,
          hull_number: dto.hull_number,
          vehicle_type: dto.vehicle_type,
          brand: dto.brand,
          model: dto.model,
          status: dto.status,
          created_by: userId,
        },
      });

      return {
        success: true,
        message: 'Kendaraan berhasil dibuat',
        data: { ...vehicle, id: vehicle.id.toString() },
      };
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      return this.handleError(error);
    }
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
  async update(id: number, dto: UpdateVehicleDto, user: CurrentUserType) {
    try {
      const vehicle = await this.prisma.db.vehicle.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!vehicle) {
        throw new NotFoundException({
          success: false,
          message: `Kendaraan dengan ID ${id} tidak ditemukan`,
        });
      }

      // Cek plate_number duplikat (kecuali kendaraan ini sendiri)
      if (dto.plate_number && dto.plate_number !== vehicle.plate_number) {
        const exists = await this.prisma.db.vehicle.findFirst({
          where: {
            plate_number: dto.plate_number,
            deleted_at: null,
            NOT: { id: BigInt(id) },
          },
        });
        if (exists) {
          throw new ConflictException({
            success: false,
            message: `Kendaraan dengan plat nomor "${dto.plate_number}" sudah terdaftar`,
          });
        }
      }

      // Cek hull_number duplikat (kecuali kendaraan ini sendiri)
      if (dto.hull_number && dto.hull_number !== vehicle.hull_number) {
        const exists = await this.prisma.db.vehicle.findFirst({
          where: {
            hull_number: dto.hull_number,
            deleted_at: null,
            NOT: { id: BigInt(id) },
          },
        });
        if (exists) {
          throw new ConflictException({
            success: false,
            message: `Kendaraan dengan nomor rangka "${dto.hull_number}" sudah terdaftar`,
          });
        }
      }

      const userId = normalizeUserId(user.id);

      const updated = await this.prisma.db.vehicle.update({
        where: { id: BigInt(id) },
        data: {
          ...(dto.plate_number !== undefined && { plate_number: dto.plate_number }),
          ...(dto.hull_number !== undefined && { hull_number: dto.hull_number }),
          ...(dto.vehicle_type !== undefined && { vehicle_type: dto.vehicle_type }),
          ...(dto.brand !== undefined && { brand: dto.brand }),
          ...(dto.model !== undefined && { model: dto.model }),
          ...(dto.status !== undefined && { status: dto.status }),
          updated_by: userId,
        },
      });

      return {
        success: true,
        message: 'Kendaraan berhasil diperbarui',
        data: { ...updated, id: updated.id.toString() },
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
      const vehicle = await this.prisma.db.vehicle.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!vehicle) {
        throw new NotFoundException({
          success: false,
          message: `Kendaraan dengan ID ${id} tidak ditemukan atau sudah dihapus`,
        });
      }

      const userId = normalizeUserId(user.id);

      await this.prisma.db.vehicle.update({
        where: { id: BigInt(id) },
        data: {
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });

      return {
        success: true,
        message: `Kendaraan "${vehicle.plate_number ?? vehicle.id}" berhasil dihapus`,
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
      return {
        success: false,
        message: 'Validation failed',
        errors: error,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        message: 'Operation failed',
        error: error.message,
      };
    }

    return {
      success: false,
      message: 'Operation failed',
      error: 'Unknown error',
    };
  }
}