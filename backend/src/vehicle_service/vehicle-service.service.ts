import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVehicleServiceDto,
  QueryVehicleServiceDto,
  UpdateVehicleServiceDto,
} from './dto/vehicle-service.dto';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';

@Injectable()
export class VehicleServiceService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────
  // GET ALL (Pagination + Datatable)
  // ──────────────────────────────────────────
  async findAll(query: QueryVehicleServiceDto) {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 10;
    const skip = (page - 1) * perPage;
    const sortBy = query.sortBy || 'service_date';
    const sortOrder = query.sortOrder || 'desc';

    try {
      const where = {
        deleted_at: null,
        ...(query.vehicle_id && { vehicle_id: BigInt(query.vehicle_id) }),
        ...(query.service_type && { service_type: query.service_type }),
        ...(query.status && { status: query.status }),
        ...((query.date_from || query.date_to) && {
          service_date: {
            ...(query.date_from && { gte: new Date(query.date_from) }),
            ...(query.date_to && { lte: new Date(query.date_to) }),
          },
        }),
        ...(query.search && {
          description: { contains: query.search, mode: 'insensitive' as const },
        }),
      };

      const [data, total] = await this.prisma.db.$transaction([
        this.prisma.db.vehicleService.findMany({
          where,
          skip,
          take: perPage,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            vehicle_services_uuid: true,
            vehicle_id: true,
            vehicle: {
              select: {
                id: true,
                plate_number: true,
                vehicle_type: true,
              },
            },
            service_date: true,
            service_type: true,
            cost: true,
            description: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        }),
        this.prisma.db.vehicleService.count({ where }),
      ]);

      return {
        success: true,
        message: 'Data servis kendaraan berhasil diambil',
        data: data.map((s) => ({
          ...s,
          id: s.id.toString(),
          vehicle_id: s.vehicle_id?.toString() ?? null,
          cost: s.cost ? Number(s.cost) : null,
          vehicle: s.vehicle
            ? { ...s.vehicle, id: s.vehicle.id.toString() }
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
      const record = await this.prisma.db.vehicleService.findFirst({
        where: { vehicle_services_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          vehicle_services_uuid: true,
          vehicle_id: true,
          vehicle: {
            select: {
              id: true,
              plate_number: true,
              vehicle_type: true,
              brand: true,
              model: true,
            },
          },
          service_date: true,
          service_type: true,
          cost: true,
          description: true,
          status: true,
          created_by: true,
          updated_by: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!record) {
        throw new NotFoundException({
          success: false,
          message: `Data servis dengan UUID ${uuid} tidak ditemukan`,
        });
      }

      return {
        success: true,
        message: 'Data servis kendaraan berhasil diambil',
        data: {
          ...record,
          id: record.id.toString(),
          vehicle_id: record.vehicle_id?.toString() ?? null,
          cost: record.cost ? Number(record.cost) : null,
          created_by: record.created_by?.toString() ?? null,
          updated_by: record.updated_by?.toString() ?? null,
          vehicle: record.vehicle
            ? { ...record.vehicle, id: record.vehicle.id.toString() }
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
  async create(dto: CreateVehicleServiceDto, user: CurrentUserType) {
    try {
      // Validasi vehicle_id exists jika diberikan
      if (dto.vehicle_id) {
        const vehicle = await this.prisma.db.vehicle.findFirst({
          where: { id: BigInt(dto.vehicle_id), deleted_at: null },
        });
        if (!vehicle) {
          throw new NotFoundException({
            success: false,
            message: `Kendaraan dengan ID ${dto.vehicle_id} tidak ditemukan`,
          });
        }
      }

      const userId = normalizeUserId(user.id);

      const record = await this.prisma.db.vehicleService.create({
        data: {
          ...(dto.vehicle_id && { vehicle_id: BigInt(dto.vehicle_id) }),
          service_date: dto.service_date ? new Date(dto.service_date) : undefined,
          service_type: dto.service_type,
          cost: dto.cost,
          description: dto.description,
          status: dto.status,
          created_by: userId,
        },
      });

      return {
        success: true,
        message: 'Data servis kendaraan berhasil dibuat',
        data: {
          ...record,
          id: record.id.toString(),
          vehicle_id: record.vehicle_id?.toString() ?? null,
          cost: record.cost ? Number(record.cost) : null,
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
  async update(id: number, dto: UpdateVehicleServiceDto, user: CurrentUserType) {
    try {
      const record = await this.prisma.db.vehicleService.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!record) {
        throw new NotFoundException({
          success: false,
          message: `Data servis dengan ID ${id} tidak ditemukan`,
        });
      }

      // Validasi vehicle_id baru jika diubah
      if (dto.vehicle_id && dto.vehicle_id !== record.vehicle_id?.toString()) {
        const vehicle = await this.prisma.db.vehicle.findFirst({
          where: { id: BigInt(dto.vehicle_id), deleted_at: null },
        });
        if (!vehicle) {
          throw new NotFoundException({
            success: false,
            message: `Kendaraan dengan ID ${dto.vehicle_id} tidak ditemukan`,
          });
        }
      }

      const userId = normalizeUserId(user.id);

      const updated = await this.prisma.db.vehicleService.update({
        where: { id: BigInt(id) },
        data: {
          ...(dto.vehicle_id !== undefined && {
            vehicle_id: dto.vehicle_id ? BigInt(dto.vehicle_id) : null,
          }),
          ...(dto.service_date !== undefined && {
            service_date: dto.service_date ? new Date(dto.service_date) : null,
          }),
          ...(dto.service_type !== undefined && { service_type: dto.service_type }),
          ...(dto.cost !== undefined && { cost: dto.cost }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.status !== undefined && { status: dto.status }),
          updated_by: userId,
        },
      });

      return {
        success: true,
        message: 'Data servis kendaraan berhasil diperbarui',
        data: {
          ...updated,
          id: updated.id.toString(),
          vehicle_id: updated.vehicle_id?.toString() ?? null,
          cost: updated.cost ? Number(updated.cost) : null,
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  // ──────────────────────────────────────────
  // SOFT DELETE
  // ──────────────────────────────────────────
  async remove(id: number, user: CurrentUserType) {
    try {
      const record = await this.prisma.db.vehicleService.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!record) {
        throw new NotFoundException({
          success: false,
          message: `Data servis dengan ID ${id} tidak ditemukan atau sudah dihapus`,
        });
      }

      const userId = normalizeUserId(user.id);

      await this.prisma.db.vehicleService.update({
        where: { id: BigInt(id) },
        data: {
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });

      return {
        success: true,
        message: `Data servis "${record.service_type ?? 'kendaraan'}" berhasil dihapus`,
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