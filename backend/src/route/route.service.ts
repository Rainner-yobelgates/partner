import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRouteDto, QueryRouteDto, UpdateRouteDto } from './dto/route.dto';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';
import { normalizePrismaCount } from 'src/utils/pagination-total.util';

@Injectable()
export class RouteService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────
  // GET ALL (Pagination + Datatable)
  // ──────────────────────────────────────────
  async findAll(query: QueryRouteDto) {
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
            { origin: { contains: query.search, mode: 'insensitive' as const } },
            { destination: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [data, totalRaw] = await this.prisma.db.$transaction([
        this.prisma.db.route.findMany({
          where,
          skip,
          take: perPage,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            routes_uuid: true,
            origin: true,
            destination: true,
            distance: true,
            estimated_time: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        }),
        this.prisma.db.route.count({ where }),
      ]);

      const total = normalizePrismaCount(totalRaw as number | bigint);

      return {
        success: true,
        message: 'Data rute berhasil diambil',
        data: data.map((r) => ({
          ...r,
          id: r.id.toString(),
          distance: r.distance ? Number(r.distance) : null,
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
      const route = await this.prisma.db.route.findFirst({
        where: { routes_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          routes_uuid: true,
          origin: true,
          destination: true,
          distance: true,
          estimated_time: true,
          status: true,
          created_by: true,
          updated_by: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!route) {
        throw new NotFoundException({
          success: false,
          message: `Rute dengan UUID ${uuid} tidak ditemukan`,
        });
      }

      return {
        success: true,
        message: 'Data rute berhasil diambil',
        data: {
          ...route,
          id: route.id.toString(),
          distance: route.distance ? Number(route.distance) : null,
          created_by: route.created_by?.toString() ?? null,
          updated_by: route.updated_by?.toString() ?? null,
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
  async create(dto: CreateRouteDto, user: CurrentUserType) {
    try {
      // Cek kombinasi origin + destination duplikat
      if (dto.origin && dto.destination) {
        const exists = await this.prisma.db.route.findFirst({
          where: {
            origin: { equals: dto.origin, mode: 'insensitive' },
            destination: { equals: dto.destination, mode: 'insensitive' },
            deleted_at: null,
          },
        });
        if (exists) {
          throw new ConflictException({
            success: false,
            message: `Rute dari "${dto.origin}" ke "${dto.destination}" sudah terdaftar`,
          });
        }
      }

      const userId = normalizeUserId(user.id);

      const route = await this.prisma.db.route.create({
        data: {
          origin: dto.origin,
          destination: dto.destination,
          distance: dto.distance,
          estimated_time: dto.estimated_time,
          status: dto.status,
          created_by: userId,
        },
      });

      return {
        success: true,
        message: 'Rute berhasil dibuat',
        data: {
          ...route,
          id: route.id.toString(),
          distance: route.distance ? Number(route.distance) : null,
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
  async update(id: number, dto: UpdateRouteDto, user: CurrentUserType) {
    try {
      const route = await this.prisma.db.route.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!route) {
        throw new NotFoundException({
          success: false,
          message: `Rute dengan ID ${id} tidak ditemukan`,
        });
      }

      // Cek kombinasi origin + destination duplikat (kecuali rute ini sendiri)
      const newOrigin = dto.origin ?? route.origin;
      const newDestination = dto.destination ?? route.destination;

      if (
        newOrigin &&
        newDestination &&
        (dto.origin !== undefined || dto.destination !== undefined)
      ) {
        const exists = await this.prisma.db.route.findFirst({
          where: {
            origin: { equals: newOrigin, mode: 'insensitive' },
            destination: { equals: newDestination, mode: 'insensitive' },
            deleted_at: null,
            NOT: { id: BigInt(id) },
          },
        });
        if (exists) {
          throw new ConflictException({
            success: false,
            message: `Rute dari "${newOrigin}" ke "${newDestination}" sudah terdaftar`,
          });
        }
      }

      const userId = normalizeUserId(user.id);

      const updated = await this.prisma.db.route.update({
        where: { id: BigInt(id) },
        data: {
          ...(dto.origin !== undefined && { origin: dto.origin }),
          ...(dto.destination !== undefined && { destination: dto.destination }),
          ...(dto.distance !== undefined && { distance: dto.distance }),
          ...(dto.estimated_time !== undefined && { estimated_time: dto.estimated_time }),
          ...(dto.status !== undefined && { status: dto.status }),
          updated_by: userId,
        },
      });

      return {
        success: true,
        message: 'Rute berhasil diperbarui',
        data: {
          ...updated,
          id: updated.id.toString(),
          distance: updated.distance ? Number(updated.distance) : null,
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
      const route = await this.prisma.db.route.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!route) {
        throw new NotFoundException({
          success: false,
          message: `Rute dengan ID ${id} tidak ditemukan atau sudah dihapus`,
        });
      }

      const userId = normalizeUserId(user.id);

      await this.prisma.db.route.update({
        where: { id: BigInt(id) },
        data: {
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });

      return {
        success: true,
        message: `Rute "${route.origin ?? ''} → ${route.destination ?? ''}" berhasil dihapus`,
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