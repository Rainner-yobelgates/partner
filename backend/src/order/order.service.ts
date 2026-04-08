import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, QueryOrderDto, UpdateOrderDto } from './dto/order.dto';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';
import { OrderStatus, Status } from 'generated/prisma/enums';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryOrderDto) {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 10;
    const skip = (page - 1) * perPage;
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'desc';
    const normalizedSortBy = sortBy === 'start_date'
      ? 'usage_date'
      : (sortBy === 'destination' ? 'dropoff_location' : sortBy);

    try {
      const where = {
        deleted_at: null,
        ...(query.status && { status: query.status }),
        ...((query.date_from || query.date_to) && {
          usage_date: {
            ...(query.date_from && { gte: new Date(query.date_from) }),
            ...(query.date_to && { lte: new Date(query.date_to) }),
          },
        }),
        ...(query.search && {
          OR: [
            { order_number: { contains: query.search } },
            { customer_name: { contains: query.search } },
            { customer_phone: { contains: query.search } },
            { customer_email: { contains: query.search } },
          ],
        }),
      };

      const [data, total] = await this.prisma.db.$transaction([
        this.prisma.db.order.findMany({
          where,
          skip,
          take: perPage,
          orderBy: { [normalizedSortBy]: sortOrder },
          select: {
            id: true,
            orders_uuid: true,
            order_number: true,
            customer_name: true,
            customer_phone: true,
            customer_email: true,
            order_date: true,
            usage_date: true,
            start_date: true,
            finish_date: true,
            standby_time: true,
            pickup_location: true,
            dropoff_location: true,
            destination: true,
            total_vehicles: true,
            total_amount: true,
            status: true,
            notes: true,
            created_at: true,
            updated_at: true,
          },
        }),
        this.prisma.db.order.count({ where }),
      ]);

      return {
        success: true,
        message: 'Data order berhasil diambil',
        data: data.map((o) => this.serializeOrder(o)),
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
      const order = await this.prisma.db.order.findFirst({
        where: { orders_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          orders_uuid: true,
          order_number: true,
          customer_name: true,
          customer_phone: true,
          customer_email: true,
          order_date: true,
          usage_date: true,
          start_date: true,
          finish_date: true,
          standby_time: true,
          pickup_location: true,
          dropoff_location: true,
          destination: true,
          total_vehicles: true,
          total_amount: true,
          status: true,
          notes: true,
          created_by: true,
          updated_by: true,
          created_at: true,
          updated_at: true,
          orderVehicles: {
            where: { deleted_at: null },
            select: {
              id: true,
              order_vehicles_uuid: true,
              vehicle_id: true,
              driver_id: true,
              assistant_driver_id: true,
              status: true,
              created_at: true,
              updated_at: true,
              vehicle: { select: { id: true, plate_number: true, vehicle_type: true } },
              driver: { select: { id: true, name: true } },
              assistantDriver: { select: { id: true, name: true } },
              tripSheets: {
                where: { deleted_at: null },
                select: { id: true, trip_sheets_uuid: true, status: true, created_at: true, updated_at: true },
              },
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException({
          success: false,
          message: `Order dengan UUID ${uuid} tidak ditemukan`,
        });
      }

      const orderVehicles = order.orderVehicles.map((ov) => this.serializeOrderVehicle(ov));
      const tripSheetLinks = order.orderVehicles.flatMap((ov) =>
        (ov.tripSheets ?? []).map((ts) => ({
          order_vehicle_id: ov.id?.toString() ?? null,
          trip_sheets_uuid: ts.trip_sheets_uuid,
          url: this.buildTripSheetLink(order.order_number, ts.trip_sheets_uuid),
        }))
      );
      return {
        success: true,
        message: 'Data order berhasil diambil',
        data: {
          ...this.serializeOrder(order),
          created_by: order.created_by?.toString() ?? null,
          updated_by: order.updated_by?.toString() ?? null,
          orderVehicles,
          trip_sheet_links: tripSheetLinks,
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  async create(dto: CreateOrderDto, user: CurrentUserType) {
    try {
      const orderNumber = await this.resolveOrderNumber(dto.order_number);

      await this.validateVehicles(dto.vehicles ?? []);

      const userId = normalizeUserId(user.id);
      const resolvedStartDate = dto.start_date ?? dto.usage_date;
      const resolvedFinishDate = dto.finish_date ?? dto.start_date ?? dto.usage_date;
      const resolvedUsageDate = dto.usage_date ?? dto.start_date ?? dto.finish_date;
      const resolvedDropoffLocation = dto.destination ?? dto.dropoff_location;

      const result = await this.prisma.db.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            order_number: orderNumber,
            customer_name: dto.customer_name,
            customer_phone: dto.customer_phone,
            customer_email: dto.customer_email,
            order_date: dto.order_date ? new Date(dto.order_date) : undefined,
            usage_date: resolvedUsageDate ? new Date(resolvedUsageDate) : undefined,
            start_date: resolvedStartDate ? new Date(resolvedStartDate) : undefined,
            finish_date: resolvedFinishDate ? new Date(resolvedFinishDate) : undefined,
            standby_time: dto.standby_time ? new Date(dto.standby_time) : undefined,
            pickup_location: dto.pickup_location,
            dropoff_location: resolvedDropoffLocation,
            destination: resolvedDropoffLocation,
            total_vehicles: dto.vehicles?.length ?? dto.total_vehicles ?? null,
            total_amount: dto.total_amount,
            status: dto.status ?? OrderStatus.PENDING,
            notes: dto.notes,
            created_by: userId,
          },
        });

        const orderVehicles: any[] = [];
        const tripSheets: any[] = [];

        for (const item of dto.vehicles ?? []) {
          const orderVehicle = await tx.orderVehicle.create({
            data: {
              order_id: order.id,
              vehicle_id: BigInt(item.vehicle_id),
              driver_id: item.driver_id ? BigInt(item.driver_id) : null,
              assistant_driver_id: item.assistant_driver_id ? BigInt(item.assistant_driver_id) : null,
              status: item.status ?? Status.ACTIVE,
              created_by: userId,
            },
          });
          orderVehicles.push(orderVehicle);

          const tripSheet = await tx.tripSheet.create({
            data: {
              order_vehicle_id: orderVehicle.id,
              driver_id: orderVehicle.driver_id,
              assistant_id: orderVehicle.assistant_driver_id,
              destination: order.destination ?? order.dropoff_location,
              status: Status.ACTIVE,
              created_by: userId,
            },
          });
          tripSheets.push(tripSheet);
        }

        return { order, orderVehicles, tripSheets };
      });

      return {
        success: true,
        message: 'Order berhasil dibuat',
        data: {
          ...this.serializeOrder(result.order),
          orderVehicles: result.orderVehicles.map((ov) => this.serializeOrderVehicle(ov)),
          trip_sheet_links: result.tripSheets.map((ts, index) => ({
            order_vehicle_id: result.orderVehicles[index]?.id?.toString() ?? null,
            trip_sheets_uuid: ts.trip_sheets_uuid,
            url: this.buildTripSheetLink(result.order.order_number, ts.trip_sheets_uuid),
          })),
        },
      };
    } catch (error: unknown) {
      if (error instanceof ConflictException || error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  async update(id: number, dto: UpdateOrderDto, user: CurrentUserType) {
    try {
      const order = await this.prisma.db.order.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!order) {
        throw new NotFoundException({
          success: false,
          message: `Order dengan ID ${id} tidak ditemukan`,
        });
      }

      if (dto.order_number && dto.order_number !== order.order_number) {
        const exists = await this.prisma.db.order.findFirst({
          where: {
            order_number: dto.order_number,
            deleted_at: null,
            NOT: { id: BigInt(id) },
          },
        });
        if (exists) {
          throw new ConflictException({
            success: false,
            message: `Order dengan nomor "${dto.order_number}" sudah terdaftar`,
          });
        }
      }

      await this.validateVehicles(dto.vehicles ?? []);

      const userId = normalizeUserId(user.id);
      const resolvedStartDate = dto.start_date ?? dto.usage_date;
      const resolvedFinishDate = dto.finish_date ?? dto.start_date ?? dto.usage_date;
      const resolvedUsageDate = dto.usage_date ?? dto.start_date ?? dto.finish_date;
      const resolvedDropoffLocation = dto.destination ?? dto.dropoff_location;
      const shouldUpdateDateAliases =
        dto.start_date !== undefined || dto.finish_date !== undefined || dto.usage_date !== undefined;
      const shouldUpdateDestinationAliases =
        dto.destination !== undefined || dto.dropoff_location !== undefined;

      const result = await this.prisma.db.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: BigInt(id) },
          data: {
            ...(dto.order_number !== undefined && { order_number: dto.order_number }),
            ...(dto.customer_name !== undefined && { customer_name: dto.customer_name }),
            ...(dto.customer_phone !== undefined && { customer_phone: dto.customer_phone }),
            ...(dto.customer_email !== undefined && { customer_email: dto.customer_email }),
            ...(dto.order_date !== undefined && { order_date: dto.order_date ? new Date(dto.order_date) : null }),
            ...(shouldUpdateDateAliases && { usage_date: resolvedUsageDate ? new Date(resolvedUsageDate) : null }),
            ...(shouldUpdateDateAliases && { start_date: resolvedStartDate ? new Date(resolvedStartDate) : null }),
            ...(shouldUpdateDateAliases && { finish_date: resolvedFinishDate ? new Date(resolvedFinishDate) : null }),
            ...(dto.standby_time !== undefined && { standby_time: dto.standby_time ? new Date(dto.standby_time) : null }),
            ...(dto.pickup_location !== undefined && { pickup_location: dto.pickup_location }),
            ...(shouldUpdateDestinationAliases && { dropoff_location: resolvedDropoffLocation }),
            ...(shouldUpdateDestinationAliases && { destination: resolvedDropoffLocation }),
            ...(dto.total_amount !== undefined && { total_amount: dto.total_amount }),
            ...(dto.status !== undefined && { status: dto.status }),
            ...(dto.notes !== undefined && { notes: dto.notes }),
            ...(dto.vehicles !== undefined && { total_vehicles: dto.vehicles.length }),
            updated_by: userId,
          },
        });

        let orderVehicles: any[] = [];
        let tripSheets: any[] = [];

        if (dto.vehicles) {
          const existing = await tx.orderVehicle.findMany({
            where: { order_id: BigInt(id), deleted_at: null },
            select: { id: true },
          });

          if (existing.length > 0) {
            const existingIds = existing.map((o) => o.id);
            await tx.orderVehicle.updateMany({
              where: { id: { in: existingIds } },
              data: { deleted_at: new Date(), deleted_by: userId },
            });

            await tx.tripSheet.updateMany({
              where: { order_vehicle_id: { in: existingIds }, deleted_at: null },
              data: { deleted_at: new Date(), deleted_by: userId },
            });
          }

          for (const item of dto.vehicles) {
            const orderVehicle = await tx.orderVehicle.create({
              data: {
                order_id: BigInt(id),
                vehicle_id: BigInt(item.vehicle_id),
                driver_id: item.driver_id ? BigInt(item.driver_id) : null,
                assistant_driver_id: item.assistant_driver_id ? BigInt(item.assistant_driver_id) : null,
                status: item.status ?? Status.ACTIVE,
                created_by: userId,
              },
            });
            orderVehicles.push(orderVehicle);

            const tripSheet = await tx.tripSheet.create({
              data: {
                order_vehicle_id: orderVehicle.id,
                driver_id: orderVehicle.driver_id,
                assistant_id: orderVehicle.assistant_driver_id,
                destination: updated.destination ?? updated.dropoff_location,
                status: Status.ACTIVE,
                created_by: userId,
              },
            });
            tripSheets.push(tripSheet);
          }
        }

        return { updated, orderVehicles, tripSheets };
      });

      return {
        success: true,
        message: 'Order berhasil diperbarui',
        data: {
          ...this.serializeOrder(result.updated),
          ...(dto.vehicles
            ? {
                orderVehicles: result.orderVehicles.map((ov) => this.serializeOrderVehicle(ov)),
                trip_sheet_links: result.tripSheets.map((ts, index) => ({
                  order_vehicle_id: result.orderVehicles[index]?.id?.toString() ?? null,
                  trip_sheets_uuid: ts.trip_sheets_uuid,
                  url: this.buildTripSheetLink(result.updated.order_number, ts.trip_sheets_uuid),
                })),
              }
            : {}),
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      return this.handleError(error);
    }
  }
  async remove(id: number, user: CurrentUserType) {
    try {
      const order = await this.prisma.db.order.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!order) {
        throw new NotFoundException({
          success: false,
          message: `Order dengan ID ${id} tidak ditemukan atau sudah dihapus`,
        });
      }

      const userId = normalizeUserId(user.id);

      await this.prisma.db.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: BigInt(id) },
          data: { deleted_at: new Date(), deleted_by: userId },
        });

        const orderVehicles = await tx.orderVehicle.findMany({
          where: { order_id: BigInt(id), deleted_at: null },
          select: { id: true },
        });

        if (orderVehicles.length > 0) {
          const ids = orderVehicles.map((o) => o.id);
          await tx.orderVehicle.updateMany({
            where: { id: { in: ids } },
            data: { deleted_at: new Date(), deleted_by: userId },
          });

          await tx.tripSheet.updateMany({
            where: { order_vehicle_id: { in: ids }, deleted_at: null },
            data: { deleted_at: new Date(), deleted_by: userId },
          });
        }
      });

      return {
        success: true,
        message: `Order "${order.order_number}" berhasil dihapus`,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  private generateTimestampCode(prefix: string) {
    const now = new Date();
    const pad = (value: number, length = 2) => value.toString().padStart(length, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`;
    const random = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${timestamp}-${random}`;
  }

  private async resolveOrderNumber(input?: string) {
    const hasInput = Boolean(input && input.trim());
    let candidate = hasInput ? input!.trim() : this.generateTimestampCode('ORD');
    let attempt = 0;

    while (true) {
      const exists = await this.prisma.db.order.findFirst({
        where: { order_number: candidate, deleted_at: null },
        select: { id: true },
      });

      if (!exists)
        return candidate;

      if (hasInput) {
        throw new ConflictException({
          success: false,
          message: `Order dengan nomor "${candidate}" sudah terdaftar`,
        });
      }

      attempt += 1;
      if (attempt > 5) {
        throw new ConflictException({
          success: false,
          message: 'Gagal menghasilkan nomor order unik. Coba lagi.',
        });
      }

      candidate = this.generateTimestampCode('ORD');
    }
  }

  private async validateVehicles(vehicles: { vehicle_id: string; driver_id?: string; assistant_driver_id?: string }[]) {
    for (const item of vehicles) {
      const vehicle = await this.prisma.db.vehicle.findFirst({
        where: { id: BigInt(item.vehicle_id), deleted_at: null },
      });
      if (!vehicle) {
        throw new NotFoundException({
          success: false,
          message: `Kendaraan dengan ID ${item.vehicle_id} tidak ditemukan`,
        });
      }

      if (item.driver_id) {
        const driver = await this.prisma.db.driver.findFirst({
          where: { id: BigInt(item.driver_id), deleted_at: null },
        });
        if (!driver) {
          throw new NotFoundException({
            success: false,
            message: `Driver dengan ID ${item.driver_id} tidak ditemukan`,
          });
        }
      }

      if (item.assistant_driver_id) {
        const driver = await this.prisma.db.driver.findFirst({
          where: { id: BigInt(item.assistant_driver_id), deleted_at: null },
        });
        if (!driver) {
          throw new NotFoundException({
            success: false,
            message: `Assistant driver dengan ID ${item.assistant_driver_id} tidak ditemukan`,
          });
        }
      }
    }
  }

  private buildTripSheetLink(orderNumber: string, uuid: string) {
    const baseUrl = process.env.FRONTEND_BASE_URL?.replace(/\/$/, '');
    const safeOrder = encodeURIComponent(orderNumber);
    const path = `/trip-sheets/${safeOrder}/${uuid}`;
    return baseUrl ? `${baseUrl}${path}` : path;
  }

  private serializeOrder(o: any) {
    return {
      ...o,
      id: o.id?.toString(),
      total_amount: o.total_amount !== null && o.total_amount !== undefined ? Number(o.total_amount) : null,
      start_date: o.start_date ?? o.usage_date ?? null,
      finish_date: o.finish_date ?? o.usage_date ?? null,
      destination: o.destination ?? o.dropoff_location ?? null,
    };
  }

  private serializeOrderVehicle(ov: any) {
    return {
      ...ov,
      id: ov.id?.toString(),
      order_id: ov.order_id?.toString() ?? null,
      vehicle_id: ov.vehicle_id?.toString() ?? null,
      driver_id: ov.driver_id?.toString() ?? null,
      assistant_driver_id: ov.assistant_driver_id?.toString() ?? null,
      vehicle: ov.vehicle ? { ...ov.vehicle, id: ov.vehicle.id.toString() } : (ov.vehicle ?? null),
      driver: ov.driver ? { ...ov.driver, id: ov.driver.id.toString() } : (ov.driver ?? null),
      assistantDriver: ov.assistantDriver ? { ...ov.assistantDriver, id: ov.assistantDriver.id.toString() } : (ov.assistantDriver ?? null),
      tripSheets: ov.tripSheets
        ? ov.tripSheets.map((ts: any) => ({
            ...ts,
            id: ts.id?.toString(),
          }))
        : undefined,
    };
  }

  private handleError(error: unknown): never {
    if (error instanceof InternalServerErrorException)
      throw error;

    if (error instanceof Error)
      throw new InternalServerErrorException(error.message);

    throw new InternalServerErrorException('Operation failed');
  }
}





