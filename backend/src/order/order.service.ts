import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { OrderStatus, Status } from 'generated/prisma/enums';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';
import { decimalToMoneyString, toPrismaDecimal } from 'src/utils/money.util';
import { normalizePrismaCount } from 'src/utils/pagination-total.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, QueryOrderDto, UpdateOrderDto } from './dto/order.dto';
import { QueryOrderRecapDto } from './dto/order-recap.dto';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async recap(query: QueryOrderRecapDto) {
    const monthStart = new Date(Date.UTC(query.year, query.month - 1, 1, 0, 0, 0, 0));
    const monthEndExclusive = new Date(Date.UTC(query.year, query.month, 1, 0, 0, 0, 0));
    let start = monthStart;
    let endExclusive = monthEndExclusive;

    if (query.date_from) {
      const dateFrom = this.parseDateFromInput(query.date_from);
      if (dateFrom > start)
        start = dateFrom;
    }

    if (query.date_to) {
      const dateToExclusive = this.parseDateToExclusiveInput(query.date_to);
      if (dateToExclusive < endExclusive)
        endExclusive = dateToExclusive;
    }

    if (endExclusive <= start) {
      throw new BadRequestException({
        success: false,
        message: 'Rentang created_at tidak valid: date_to harus lebih besar dari date_from',
      });
    }

    try {
      const orders = await this.prisma.db.order.findMany({
        where: {
          deleted_at: null,
          created_at: { gte: start, lt: endExclusive },
        },
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          orders_uuid: true,
          order_number: true,
          customer_name: true,
          customer_phone: true,
          destination: true,
          dropoff_location: true,
          total_amount: true,
          status: true,
          created_at: true,
          orderVehicles: {
            where: { deleted_at: null },
            select: {
              tripSheets: {
                where: { deleted_at: null },
                select: {
                  fuel_cost: true,
                  toll_fee: true,
                  parking_fee: true,
                  stay_cost: true,
                  others: true,
                },
              },
            },
          },
        },
      });

      let sumIncome = new Prisma.Decimal(0);
      let sumExpense = new Prisma.Decimal(0);
      let sumProfit = new Prisma.Decimal(0);

      const data = orders.map((order) => {
        const agg = this.aggregateTripSheetCosts(order.orderVehicles);
        const income = order.total_amount != null ? new Prisma.Decimal(order.total_amount as any) : new Prisma.Decimal(0);
        const expense = agg.total;
        const profit = income.sub(expense);
        const tripSheetCount = agg.tripSheetCount;

        sumIncome = sumIncome.add(income);
        sumExpense = sumExpense.add(expense);
        sumProfit = sumProfit.add(profit);

        return {
          id: order.id.toString(),
          orders_uuid: order.orders_uuid,
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          destination: order.destination ?? order.dropoff_location ?? null,
          status: order.status,
          created_at: order.created_at,
          trip_sheet_count: tripSheetCount,
          income: decimalToMoneyString(income),
          expense_fuel: decimalToMoneyString(agg.fuel),
          expense_toll: decimalToMoneyString(agg.toll),
          expense_parking: decimalToMoneyString(agg.parking),
          expense_stay: decimalToMoneyString(agg.stay),
          expense_others: decimalToMoneyString(agg.others),
          total_expense: decimalToMoneyString(expense),
          profit: decimalToMoneyString(profit),
        };
      });

      return {
        success: true,
        message: 'Rekapitulasi reservasi berhasil diambil',
        data,
        summary: {
          order_count: data.length,
          total_income: decimalToMoneyString(sumIncome),
          total_expense: decimalToMoneyString(sumExpense),
          total_profit: decimalToMoneyString(sumProfit),
        },
        filter: {
          month: query.month,
          year: query.year,
          created_from: start.toISOString(),
          created_to_before: endExclusive.toISOString(),
        },
      };
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  private parseDateFromInput(raw: string): Date {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
    const date = dateOnly ? new Date(`${raw}T00:00:00.000Z`) : new Date(raw);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException({
        success: false,
        message: 'date_from tidak valid',
      });
    }

    return date;
  }

  private parseDateToExclusiveInput(raw: string): Date {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
    const date = dateOnly ? new Date(`${raw}T00:00:00.000Z`) : new Date(raw);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException({
        success: false,
        message: 'date_to tidak valid',
      });
    }

    if (dateOnly) {
      date.setUTCDate(date.getUTCDate() + 1);
      return date;
    }

    return date;
  }

  private aggregateTripSheetCosts(
    orderVehicles: Array<{ tripSheets: Array<{
      fuel_cost: Prisma.Decimal | null;
      toll_fee: Prisma.Decimal | null;
      parking_fee: Prisma.Decimal | null;
      stay_cost: Prisma.Decimal | null;
      others: Prisma.Decimal | null;
    }> }>,
  ) {
    let fuel = new Prisma.Decimal(0);
    let toll = new Prisma.Decimal(0);
    let parking = new Prisma.Decimal(0);
    let stay = new Prisma.Decimal(0);
    let others = new Prisma.Decimal(0);
    let tripSheetCount = 0;

    const d = (v: Prisma.Decimal | null | undefined) =>
      v != null ? new Prisma.Decimal(v as any) : new Prisma.Decimal(0);

    for (const ov of orderVehicles) {
      for (const ts of ov.tripSheets ?? []) {
        tripSheetCount += 1;
        fuel = fuel.add(d(ts.fuel_cost));
        toll = toll.add(d(ts.toll_fee));
        parking = parking.add(d(ts.parking_fee));
        stay = stay.add(d(ts.stay_cost));
        others = others.add(d(ts.others));
      }
    }

    const total = fuel.add(toll).add(parking).add(stay).add(others);
    return { fuel, toll, parking, stay, others, total, tripSheetCount };
  }

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
            { order_number: { contains: query.search, mode: 'insensitive' as const } },
            { customer_name: { contains: query.search, mode: 'insensitive' as const } },
            { customer_phone: { contains: query.search, mode: 'insensitive' as const } },
            { customer_email: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [data, totalRaw] = await this.prisma.db.$transaction([
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

      const total = normalizePrismaCount(totalRaw as number | bigint);

      return {
        success: true,
        message: 'Data order berhasil diambil',
        data: data.map((order) => this.serializeOrder(order)),
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

      const orderVehicles = order.orderVehicles.map((orderVehicle) => this.serializeOrderVehicle(orderVehicle));
      const tripSheetLinks = order.orderVehicles.flatMap((orderVehicle) =>
        (orderVehicle.tripSheets ?? []).map((tripSheet) => ({
          order_vehicle_id: orderVehicle.id?.toString() ?? null,
          trip_sheets_uuid: tripSheet.trip_sheets_uuid,
          url: this.buildTripSheetLink(order.order_number, tripSheet.trip_sheets_uuid),
        })),
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
      if (error instanceof NotFoundException)
        throw error;
      return this.handleError(error);
    }
  }

  async create(dto: CreateOrderDto, user: CurrentUserType) {
    try {
      const orderNumber = await this.resolveOrderNumber(dto.order_number);
      await this.validateVehicles(dto.vehicles ?? []);

      const { resolvedUsageDate, resolvedStartDate, resolvedFinishDate } = this.resolveDateAliases(dto);

      const userId = normalizeUserId(user.id);
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
            total_amount: toPrismaDecimal(dto.total_amount),
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

      const freshOrder = await this.prisma.db.order.findUnique({
        where: { id: result.order.id },
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
      });

      return {
        success: true,
        message: 'Order berhasil dibuat',
        data: {
          ...this.serializeOrder(freshOrder ?? result.order),
          orderVehicles: result.orderVehicles.map((orderVehicle) => this.serializeOrderVehicle(orderVehicle)),
          trip_sheet_links: result.tripSheets.map((tripSheet, index) => ({
            order_vehicle_id: result.orderVehicles[index]?.id?.toString() ?? null,
            trip_sheets_uuid: tripSheet.trip_sheets_uuid,
            url: this.buildTripSheetLink(result.order.order_number, tripSheet.trip_sheets_uuid),
          })),
        },
      };
    } catch (error: unknown) {
      if (error instanceof ConflictException || error instanceof NotFoundException)
        throw error;
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
          select: { id: true },
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
      const { resolvedUsageDate, resolvedStartDate, resolvedFinishDate } = this.resolveDateAliases(dto);
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
            ...(dto.total_amount !== undefined && { total_amount: toPrismaDecimal(dto.total_amount) }),
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
            const existingIds = existing.map((item) => item.id);
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
        } else if (shouldUpdateDestinationAliases) {
          const activeOrderVehicles = await tx.orderVehicle.findMany({
            where: { order_id: BigInt(id), deleted_at: null },
            select: { id: true },
          });

          if (activeOrderVehicles.length > 0) {
            await tx.tripSheet.updateMany({
              where: {
                order_vehicle_id: { in: activeOrderVehicles.map((item) => item.id) },
                deleted_at: null,
              },
              data: {
                destination: updated.destination ?? updated.dropoff_location,
              },
            });
          }
        }

        return { updated, orderVehicles, tripSheets };
      });

      const freshOrder = await this.prisma.db.order.findUnique({
        where: { id: result.updated.id },
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
      });

      return {
        success: true,
        message: 'Order berhasil diperbarui',
        data: {
          ...this.serializeOrder(freshOrder ?? result.updated),
          ...(dto.vehicles
            ? {
                orderVehicles: result.orderVehicles.map((orderVehicle) => this.serializeOrderVehicle(orderVehicle)),
                trip_sheet_links: result.tripSheets.map((tripSheet, index) => ({
                  order_vehicle_id: result.orderVehicles[index]?.id?.toString() ?? null,
                  trip_sheets_uuid: tripSheet.trip_sheets_uuid,
                  url: this.buildTripSheetLink(result.updated.order_number, tripSheet.trip_sheets_uuid),
                })),
              }
            : {}),
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ConflictException)
        throw error;
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
          const ids = orderVehicles.map((item) => item.id);
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
      if (error instanceof NotFoundException)
        throw error;
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

  private resolveDateAliases(dto: Pick<CreateOrderDto, 'usage_date' | 'start_date' | 'finish_date'>) {
    const resolvedStartDate = dto.start_date ?? dto.usage_date;
    const resolvedFinishDate = dto.finish_date ?? dto.start_date ?? dto.usage_date;
    const resolvedUsageDate = dto.usage_date ?? dto.start_date ?? dto.finish_date;

    return {
      resolvedStartDate,
      resolvedFinishDate,
      resolvedUsageDate,
    };
  }

  private async validateVehicles(vehicles: { vehicle_id: string; driver_id?: string; assistant_driver_id?: string }[]) {
    for (const item of vehicles) {
      const vehicle = await this.prisma.db.vehicle.findFirst({
        where: { id: BigInt(item.vehicle_id), deleted_at: null },
        select: { id: true },
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
          select: { id: true },
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
          select: { id: true },
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

  private serializeOrder(order: any) {
    return {
      ...order,
      id: order.id?.toString(),
      total_amount: decimalToMoneyString(order.total_amount),
      start_date: order.start_date ?? order.usage_date ?? null,
      finish_date: order.finish_date ?? order.usage_date ?? null,
      destination: order.destination ?? order.dropoff_location ?? null,
    };
  }

  private serializeOrderVehicle(orderVehicle: any) {
    return {
      ...orderVehicle,
      id: orderVehicle.id?.toString(),
      order_id: orderVehicle.order_id?.toString() ?? null,
      vehicle_id: orderVehicle.vehicle_id?.toString() ?? null,
      driver_id: orderVehicle.driver_id?.toString() ?? null,
      assistant_driver_id: orderVehicle.assistant_driver_id?.toString() ?? null,
      vehicle: orderVehicle.vehicle ? { ...orderVehicle.vehicle, id: orderVehicle.vehicle.id.toString() } : (orderVehicle.vehicle ?? null),
      driver: orderVehicle.driver ? { ...orderVehicle.driver, id: orderVehicle.driver.id.toString() } : (orderVehicle.driver ?? null),
      assistantDriver: orderVehicle.assistantDriver ? { ...orderVehicle.assistantDriver, id: orderVehicle.assistantDriver.id.toString() } : (orderVehicle.assistantDriver ?? null),
      tripSheets: orderVehicle.tripSheets
        ? orderVehicle.tripSheets.map((tripSheet: any) => ({
            ...tripSheet,
            id: tripSheet.id?.toString(),
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
