import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShuttleDto, QueryShuttleDto, UpdateShuttleDto } from './dto/shuttle.dto';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';
import { Prisma } from 'generated/prisma/client';
import { decimalToMoneyString, toPrismaDecimal } from 'src/utils/money.util';
import { normalizePrismaCount } from 'src/utils/pagination-total.util';

const shuttleListSelect = {
  id: true,
  shuttles_uuid: true,
  client_id: true,
  vehicle_id: true,
  route_id: true,
  client: {
    select: { id: true, clients_uuid: true, name: true, code: true },
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
} as const;

@Injectable()
export class ShuttleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryShuttleDto) {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 10;
    const skip = (page - 1) * perPage;
    const sortByRaw = query.sortBy || 'scheduled_date';
    const sortBy = ['scheduled_date', 'created_at', 'updated_at', 'id'].includes(sortByRaw)
      ? sortByRaw
      : 'scheduled_date';
    const sortOrder = query.sortOrder || 'desc';

    try {
      const where = {
        deleted_at: null,
        ...(query.client_id && { client_id: BigInt(query.client_id) }),
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

      const [data, totalRaw] = await this.prisma.db.$transaction([
        this.prisma.db.shuttle.findMany({
          where,
          skip,
          take: perPage,
          orderBy: { [sortBy]: sortOrder },
          select: shuttleListSelect,
        }),
        this.prisma.db.shuttle.count({ where }),
      ]);

      const total = normalizePrismaCount(totalRaw as number | bigint);

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

  async findOne(uuid: string) {
    try {
      const shuttle = await this.prisma.db.shuttle.findFirst({
        where: { shuttles_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          shuttles_uuid: true,
          client_id: true,
          vehicle_id: true,
          route_id: true,
          client: {
            select: {
              id: true,
              clients_uuid: true,
              name: true,
              code: true,
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

  async create(dto: CreateShuttleDto, user: CurrentUserType) {
    try {
      await this.validateRelations(dto);

      const userId = normalizeUserId(user.id);
      const shuttle = await this.prisma.db.shuttle.create({
        data: {
          client_id: BigInt(dto.client_id),
          ...(dto.vehicle_id && { vehicle_id: BigInt(dto.vehicle_id) }),
          ...(dto.route_id && { route_id: BigInt(dto.route_id) }),
          ...(dto.crew_incentive !== undefined && { crew_incentive: toPrismaDecimal(dto.crew_incentive) }),
          scheduled_date: dto.scheduled_date ? new Date(dto.scheduled_date) : undefined,
          ...(dto.fuel !== undefined && { fuel: toPrismaDecimal(dto.fuel) }),
          ...(dto.toll_fee !== undefined && { toll_fee: toPrismaDecimal(dto.toll_fee) }),
          ...(dto.others !== undefined && { others: toPrismaDecimal(dto.others) }),
          status: dto.status,
          created_by: userId,
        } as Prisma.ShuttleUncheckedCreateInput,
      });

      const full = await this.prisma.db.shuttle.findFirst({
        where: { id: shuttle.id },
        select: shuttleListSelect,
      });

      return {
        success: true,
        message: 'Shuttle berhasil dibuat',
        data: this.serializeShuttle(full ?? shuttle),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadRequestException)
        throw error;
      return this.handleError(error);
    }
  }

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

      await this.validateRelations(dto, { client_id: shuttle.client_id });

      const userId = normalizeUserId(user.id);

      const updated = await this.prisma.db.shuttle.update({
        where: { id: BigInt(id) },
        data: {
          ...(dto.client_id !== undefined && { client_id: BigInt(dto.client_id) }),
          ...(dto.vehicle_id !== undefined && {
            vehicle_id: dto.vehicle_id ? BigInt(dto.vehicle_id) : null,
          }),
          ...(dto.route_id !== undefined && {
            route_id: dto.route_id ? BigInt(dto.route_id) : null,
          }),
          ...(dto.crew_incentive !== undefined && { crew_incentive: toPrismaDecimal(dto.crew_incentive) }),
          ...(dto.scheduled_date !== undefined && {
            scheduled_date: dto.scheduled_date ? new Date(dto.scheduled_date) : null,
          }),
          ...(dto.fuel !== undefined && { fuel: toPrismaDecimal(dto.fuel) }),
          ...(dto.toll_fee !== undefined && { toll_fee: toPrismaDecimal(dto.toll_fee) }),
          ...(dto.others !== undefined && { others: toPrismaDecimal(dto.others) }),
          ...(dto.status !== undefined && { status: dto.status }),
          updated_by: userId,
        } as Prisma.ShuttleUncheckedUpdateInput,
      });

      const full = await this.prisma.db.shuttle.findFirst({
        where: { id: updated.id },
        select: shuttleListSelect,
      });

      return {
        success: true,
        message: 'Shuttle berhasil diperbarui',
        data: this.serializeShuttle(full ?? updated),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadRequestException)
        throw error;
      return this.handleError(error);
    }
  }

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

  private async ensureClientExists(clientId: string) {
    const client = await this.prisma.db.client.findFirst({
      where: { id: BigInt(clientId), deleted_at: null },
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException({
        success: false,
        message: `Klien dengan ID ${clientId} tidak ditemukan`,
      });
    }
  }

  private async validateRelations(
    dto: CreateShuttleDto | UpdateShuttleDto,
    existing?: { client_id: bigint },
  ) {
    const isCreate = existing === undefined;

    if (isCreate) {
      const c = dto as CreateShuttleDto;
      if (!c.client_id?.trim()) {
        throw new BadRequestException({
          success: false,
          message: 'client_id wajib diisi',
        });
      }
      await this.ensureClientExists(c.client_id);
    }
    else if (dto.client_id !== undefined) {
      if (!dto.client_id.trim()) {
        throw new BadRequestException({
          success: false,
          message: 'client_id tidak boleh dikosongkan',
        });
      }
      await this.ensureClientExists(dto.client_id);
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

  private serializeShuttle(s: any) {
    return {
      ...s,
      id: s.id?.toString(),
      client_id: s.client_id?.toString() ?? null,
      vehicle_id: s.vehicle_id?.toString() ?? null,
      route_id: s.route_id?.toString() ?? null,
      crew_incentive: decimalToMoneyString(s.crew_incentive),
      fuel: decimalToMoneyString(s.fuel),
      toll_fee: decimalToMoneyString(s.toll_fee),
      others: decimalToMoneyString(s.others),
      client: s.client
        ? { ...s.client, id: s.client.id.toString() }
        : (s.client === null ? null : undefined),
      vehicle: s.vehicle
        ? { ...s.vehicle, id: s.vehicle.id.toString() }
        : (s.vehicle === null ? null : undefined),
      route: s.route
        ? { ...s.route, id: s.route.id.toString() }
        : (s.route === null ? null : undefined),
    };
  }

  private handleError(error: unknown) {
    if (error instanceof Array) {
      return { success: false, message: 'Validation failed', errors: error };
    }
    if (error instanceof Error) {
      return { success: false, message: error.message || 'Operation failed', error: error.message };
    }
    return { success: false, message: 'Operation failed', error: 'Unknown error' };
  }
}
