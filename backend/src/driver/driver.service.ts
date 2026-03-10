import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto, QueryDriverDto, UpdateDriverDto } from './dto/driver.dto';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────
  // GET ALL (Pagination + Datatable)
  // ──────────────────────────────────────────
  async findAll(query: QueryDriverDto) {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 10;
    const skip = (page - 1) * perPage;
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'desc';

    try {
      const where = {
        deleted_at: null,
        ...(query.type && { type: query.type }),
        ...(query.status && { status: query.status }),
        ...(query.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { phone_number: { contains: query.search, mode: 'insensitive' as const } },
            { address: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [data, total] = await this.prisma.db.$transaction([
        this.prisma.db.driver.findMany({
          where,
          skip,
          take: perPage,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            drivers_uuid: true,
            name: true,
            phone_number: true,
            emergency_contact: true,
            address: true,
            type: true,
            status: true,
            vehicle_id: true,
            vehicle: {
              select: {
                id: true,
                plate_number: true,
              },
            },
            created_at: true,
            updated_at: true,
          },
        }),
        this.prisma.db.driver.count({ where }),
      ]);

      return {
        success: true,
        message: 'Data driver berhasil diambil',
        data: data.map((d) => ({
          ...d,
          id: d.id.toString(),
          vehicle_id: d.vehicle_id?.toString() ?? null,
          vehicle: d.vehicle
            ? { ...d.vehicle, id: d.vehicle.id.toString() }
            : null,
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
      const driver = await this.prisma.db.driver.findFirst({
        where: { drivers_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          drivers_uuid: true,
          name: true,
          phone_number: true,
          emergency_contact: true,
          address: true,
          type: true,
          status: true,
          vehicle_id: true,
          vehicle: {
            select: {
              id: true,
              plate_number: true,
            },
          },
          created_by: true,
          updated_by: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!driver) {
        throw new NotFoundException({
          success: false,
          message: `Driver dengan UUID ${uuid} tidak ditemukan`,
        });
      }

      return {
        success: true,
        message: 'Data driver berhasil diambil',
        data: {
          ...driver,
          id: driver.id.toString(),
          vehicle_id: driver.vehicle_id?.toString() ?? null,
          created_by: driver.created_by?.toString() ?? null,
          updated_by: driver.updated_by?.toString() ?? null,
          vehicle: driver.vehicle
            ? { ...driver.vehicle, id: driver.vehicle.id.toString() }
            : null,
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
  async create(dto: CreateDriverDto, user: CurrentUserType) {
    try {
      // Cek nomor telepon duplikat jika diberikan
      if (dto.phone_number) {
        const exists = await this.prisma.db.driver.findFirst({
          where: { phone_number: dto.phone_number, deleted_at: null },
        });
        if (exists) {
          throw new ConflictException({
            success: false,
            message: `Driver dengan nomor telepon "${dto.phone_number}" sudah terdaftar`,
          });
        }
      }

      const userId = normalizeUserId(user.id);

      const driver = await this.prisma.db.driver.create({
        data: {
          ...(dto.vehicle_id && { vehicle_id: BigInt(dto.vehicle_id) }),
          name: dto.name,
          phone_number: dto.phone_number,
          emergency_contact: dto.emergency_contact,
          address: dto.address,
          type: dto.type,
          status: dto.status,
          created_by: userId,
        },
      });

      return {
        success: true,
        message: 'Driver berhasil dibuat',
        data: {
          ...driver,
          id: driver.id.toString(),
          vehicle_id: driver.vehicle_id?.toString() ?? null,
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
  async update(id: number, dto: UpdateDriverDto, user: CurrentUserType) {
    try {
      const driver = await this.prisma.db.driver.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!driver) {
        throw new NotFoundException({
          success: false,
          message: `Driver dengan ID ${id} tidak ditemukan`,
        });
      }

      // Cek nomor telepon duplikat (kecuali driver ini sendiri)
      if (dto.phone_number && dto.phone_number !== driver.phone_number) {
        const exists = await this.prisma.db.driver.findFirst({
          where: {
            phone_number: dto.phone_number,
            deleted_at: null,
            NOT: { id: BigInt(id) },
          },
        });
        if (exists) {
          throw new ConflictException({
            success: false,
            message: `Driver dengan nomor telepon "${dto.phone_number}" sudah terdaftar`,
          });
        }
      }

      const userId = normalizeUserId(user.id);

      const updated = await this.prisma.db.driver.update({
        where: { id: BigInt(id) },
        data: {
          ...(dto.vehicle_id !== undefined && {
            vehicle_id: dto.vehicle_id ? BigInt(dto.vehicle_id) : null,
          }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.phone_number !== undefined && { phone_number: dto.phone_number }),
          ...(dto.emergency_contact !== undefined && { emergency_contact: dto.emergency_contact }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.status !== undefined && { status: dto.status }),
          updated_by: userId,
        },
      });

      return {
        success: true,
        message: 'Driver berhasil diperbarui',
        data: {
          ...updated,
          id: updated.id.toString(),
          vehicle_id: updated.vehicle_id?.toString() ?? null,
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
      const driver = await this.prisma.db.driver.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!driver) {
        throw new NotFoundException({
          success: false,
          message: `Driver dengan ID ${id} tidak ditemukan atau sudah dihapus`,
        });
      }

      const userId = normalizeUserId(user.id);

      await this.prisma.db.driver.update({
        where: { id: BigInt(id) },
        data: {
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });

      return {
        success: true,
        message: `Driver "${driver.name}" berhasil dihapus`,
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