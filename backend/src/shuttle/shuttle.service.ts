import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShuttleDto, QueryShuttleDto, UpdateShuttleDto } from './dto/shuttle.dto';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class ShuttleService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────
  // GET ALL (Pagination + Datatable)
  // ──────────────────────────────────────────
  async findAll(query: QueryShuttleDto) {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 10;
    const skip = (page - 1) * perPage;
    const sortBy = query.sortBy || 'scheduled_date';
    const sortOrder = query.sortOrder || 'desc';

    try {
      const where = {
        deleted_at: null,
        ...(query.contract_id && { contract_id: BigInt(query.contract_id) }),
        ...(query.vehicle_id && { vehicle_id: BigInt(query.vehicle_id) }),
        ...(query.route_id && { route_id: BigInt(query.route_id) }),
        ...(query.status && { status: query.status }),
        ...((query.date_from || query.date_to) && {
          scheduled_date: {
            ...(query.date_from && { gte: new Date(query.date_from) }),
            ...(query.date_to && { lte: new Date(query.date_to) }),
          },
        }),
      };

      const [data, total] = await this.prisma.db.$transaction([
        this.prisma.db.shuttle.findMany({
          where,
          skip,
          take: perPage,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            shuttles_uuid: true,
            contract_id: true,
            vehicle_id: true,
            route_id: true,
            contract: {
              select: { id: true, contract_number: true, contact_person: true },
            },
            vehicle: {
              select: { id: true, plate_number: true, vehicle_type: true },
            },
            route: {
              select: { id: true, origin: true, destination: true },
            },
            crew_incentive: true,
            scheduled_date: true,
            fuel: true,
            toll_fee: true,
            others: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        }),
        this.prisma.db.shuttle.count({ where }),
      ]);

      return {
        success: true,
        message: 'Data shuttle berhasil diambil',
        data: data.map((s) => this.serializeShuttle(s)),
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
      const shuttle = await this.prisma.db.shuttle.findFirst({
        where: { shuttles_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          shuttles_uuid: true,
          contract_id: true,
          vehicle_id: true,
          route_id: true,
          contract: {
            select: {
              id: true,
              contract_number: true,
              contact_person: true,
              phone_number: true,
              email: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              plate_number: true,
              vehicle_type: true,
              brand: true,
              model: true,
            },
          },
          route: {
            select: {
              id: true,
              origin: true,
              destination: true,
              distance: true,
              estimated_time: true,
            },
          },
          crew_incentive: true,
          scheduled_date: true,
          fuel: true,
          toll_fee: true,
          others: true,
          status: true,
          created_by: true,
          updated_by: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!shuttle) {
        throw new NotFoundException({
          success: false,
          message: `Shuttle dengan UUID ${uuid} tidak ditemukan`,
        });
      }

      return {
        success: true,
        message: 'Data shuttle berhasil diambil',
        data: {
          ...this.serializeShuttle(shuttle),
          created_by: shuttle.created_by?.toString() ?? null,
          updated_by: shuttle.updated_by?.toString() ?? null,
          route: shuttle.route
            ? {
                ...shuttle.route,
                id: shuttle.route.id.toString(),
                distance: shuttle.route.distance ? Number(shuttle.route.distance) : null,
              }
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
  async create(dto: CreateShuttleDto, user: CurrentUserType) {
    try {
      await this.validateRelations(dto);

      const userId = normalizeUserId(user.id);
      const shuttle = await this.prisma.db.shuttle.create({
        data: {
          ...(dto.contract_id && { contract_id: BigInt(dto.contract_id) }),
          ...(dto.vehicle_id && { vehicle_id: BigInt(dto.vehicle_id) }),
          ...(dto.route_id && { route_id: BigInt(dto.route_id) }),
          crew_incentive: dto.crew_incentive,
          scheduled_date: dto.scheduled_date ? new Date(dto.scheduled_date) : undefined,
          fuel: dto.fuel,
          toll_fee: dto.toll_fee,
          others: dto.others,
          status: dto.status,
          created_by: userId,
        } as Prisma.ShuttleUncheckedCreateInput,
      });

      return {
        success: true,
        message: 'Shuttle berhasil dibuat',
        data: this.serializeShuttle(shuttle),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
  async update(id: number, dto: UpdateShuttleDto, user: CurrentUserType) {
    try {
      const shuttle = await this.prisma.db.shuttle.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!shuttle) {
        throw new NotFoundException({
          success: false,
          message: `Shuttle dengan ID ${id} tidak ditemukan`,
        });
      }

      await this.validateRelations(dto);

      const userId = normalizeUserId(user.id);

      const updated = await this.prisma.db.shuttle.update({
        where: { id: BigInt(id) },
        data: {
          ...(dto.contract_id !== undefined && {
            contract_id: dto.contract_id ? BigInt(dto.contract_id) : null,
          }),
          ...(dto.vehicle_id !== undefined && {
            vehicle_id: dto.vehicle_id ? BigInt(dto.vehicle_id) : null,
          }),
          ...(dto.route_id !== undefined && {
            route_id: dto.route_id ? BigInt(dto.route_id) : null,
          }),
          ...(dto.crew_incentive !== undefined && { crew_incentive: dto.crew_incentive }),
          ...(dto.scheduled_date !== undefined && {
            scheduled_date: dto.scheduled_date ? new Date(dto.scheduled_date) : null,
          }),
          ...(dto.fuel !== undefined && { fuel: dto.fuel }),
          ...(dto.toll_fee !== undefined && { toll_fee: dto.toll_fee }),
          ...(dto.others !== undefined && { others: dto.others }),
          ...(dto.status !== undefined && { status: dto.status }),
          updated_by: userId,
        } as Prisma.ShuttleUncheckedUpdateInput,
      });

      return {
        success: true,
        message: 'Shuttle berhasil diperbarui',
        data: this.serializeShuttle(updated),
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
      const shuttle = await this.prisma.db.shuttle.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!shuttle) {
        throw new NotFoundException({
          success: false,
          message: `Shuttle dengan ID ${id} tidak ditemukan atau sudah dihapus`,
        });
      }

      const userId = normalizeUserId(user.id);

      await this.prisma.db.shuttle.update({
        where: { id: BigInt(id) },
        data: {
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });

      return {
        success: true,
        message: `Shuttle "${shuttle.shuttles_uuid}" berhasil dihapus`,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  // ──────────────────────────────────────────
  // HELPER: Validate Foreign Key Relations
  // ──────────────────────────────────────────
  private async validateRelations(dto: CreateShuttleDto | UpdateShuttleDto) {
    if (dto.contract_id) {
      const contract = await this.prisma.db.contract.findFirst({
        where: { id: BigInt(dto.contract_id), deleted_at: null },
      });
      if (!contract) {
        throw new NotFoundException({
          success: false,
          message: `Kontrak dengan ID ${dto.contract_id} tidak ditemukan`,
        });
      }
    }

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

    if (dto.route_id) {
      const route = await this.prisma.db.route.findFirst({
        where: { id: BigInt(dto.route_id), deleted_at: null },
      });
      if (!route) {
        throw new NotFoundException({
          success: false,
          message: `Rute dengan ID ${dto.route_id} tidak ditemukan`,
        });
      }
    }
  }

  // ──────────────────────────────────────────
  // HELPER: Serialize BigInt & Decimal fields
  // ──────────────────────────────────────────
  private serializeShuttle(s: any) {
    return {
      ...s,
      id: s.id?.toString(),
      contract_id: s.contract_id?.toString() ?? null,
      vehicle_id: s.vehicle_id?.toString() ?? null,
      route_id: s.route_id?.toString() ?? null,
      crew_incentive: s.crew_incentive ? Number(s.crew_incentive) : null,
      fuel: s.fuel ? Number(s.fuel) : null,
      toll_fee: s.toll_fee ? Number(s.toll_fee) : null,
      others: s.others ? Number(s.others) : null,
      contract: s.contract
        ? { ...s.contract, id: s.contract.id.toString() }
        : (s.contract === null ? null : undefined),
      vehicle: s.vehicle
        ? { ...s.vehicle, id: s.vehicle.id.toString() }
        : (s.vehicle === null ? null : undefined),
      route: s.route
        ? { ...s.route, id: s.route.id.toString() }
        : (s.route === null ? null : undefined),
    };
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