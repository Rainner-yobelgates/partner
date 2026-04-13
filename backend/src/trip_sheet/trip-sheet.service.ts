import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryTripSheetDto, UpdateTripSheetDto, UpdateTripSheetPublicDto } from './dto/trip-sheet.dto';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';
import { decimalToMoneyString, toPrismaDecimal } from 'src/utils/money.util';
import { normalizePrismaCount } from 'src/utils/pagination-total.util';

@Injectable()
export class TripSheetService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryTripSheetDto) {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 10;
    const skip = (page - 1) * perPage;
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'desc';

    try {
      const where = {
        deleted_at: null,
        ...(query.status && { status: query.status }),
        ...(query.order_id && { orderVehicle: { order_id: BigInt(query.order_id) } }),
        ...(query.driver_id && { driver_id: BigInt(query.driver_id) }),
        ...((query.date_from || query.date_to) && {
          created_at: {
            ...(query.date_from && { gte: new Date(query.date_from) }),
            ...(query.date_to && { lte: new Date(query.date_to) }),
          },
        }),
        ...(query.search && {
          OR: [
            { destination: { contains: query.search } },
            { expense_notes: { contains: query.search } },
          ],
        }),
      };

      const [data, totalRaw] = await this.prisma.db.$transaction([
        this.prisma.db.tripSheet.findMany({
          where,
          skip,
          take: perPage,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            trip_sheets_uuid: true,
            order_vehicle_id: true,
            driver_id: true,
            assistant_id: true,
            destination: true,
            fuel_cost: true,
            toll_fee: true,
            parking_fee: true,
            stay_cost: true,
            others: true,
            expense_notes: true,
            attachment: true,
            status: true,
            public_submitted_at: true,
            created_at: true,
            updated_at: true,
            orderVehicle: {
              select: {
                id: true,
                order: {
                  select: {
                    id: true,
                    order_number: true,
                    customer_name: true,
                    customer_phone: true,
                    pickup_location: true,
                    standby_time: true,
                    start_date: true,
                    finish_date: true,
                    destination: true,
                    dropoff_location: true,
                  },
                },
                vehicle: { select: { id: true, plate_number: true, vehicle_type: true } },
              },
            },
            driver: { select: { id: true, name: true } },
            assistant: { select: { id: true, name: true } },
          },
        }),
        this.prisma.db.tripSheet.count({ where }),
      ]);

      const total = normalizePrismaCount(totalRaw as number | bigint);

      return {
        success: true,
        message: 'Data trip sheet berhasil diambil',
        data: data.map((t) => this.serializeTripSheet(t)),
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
      const tripSheet = await this.prisma.db.tripSheet.findFirst({
        where: { trip_sheets_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          trip_sheets_uuid: true,
          order_vehicle_id: true,
          driver_id: true,
          assistant_id: true,
          destination: true,
          fuel_cost: true,
          toll_fee: true,
          parking_fee: true,
          stay_cost: true,
          others: true,
          expense_notes: true,
          attachment: true,
          status: true,
          public_submitted_at: true,
          created_by: true,
          updated_by: true,
          created_at: true,
          updated_at: true,
          orderVehicle: {
            select: {
              id: true,
              order: {
                select: {
                  id: true,
                  order_number: true,
                  customer_name: true,
                  customer_phone: true,
                  pickup_location: true,
                    standby_time: true,
                    start_date: true,
                    finish_date: true,
                    destination: true,
                  dropoff_location: true,
                },
              },
              vehicle: { select: { id: true, plate_number: true, vehicle_type: true } },
            },
          },
          driver: { select: { id: true, name: true } },
          assistant: { select: { id: true, name: true } },
        },
      });

      if (!tripSheet) {
        throw new NotFoundException({
          success: false,
          message: `Trip sheet dengan UUID ${uuid} tidak ditemukan`,
        });
      }

      return {
        success: true,
        message: 'Data trip sheet berhasil diambil',
        data: {
          ...this.serializeTripSheet(tripSheet),
          created_by: tripSheet.created_by?.toString() ?? null,
          updated_by: tripSheet.updated_by?.toString() ?? null,
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  async update(id: number, dto: UpdateTripSheetDto, user: CurrentUserType) {
    try {
      const tripSheet = await this.prisma.db.tripSheet.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!tripSheet) {
        throw new NotFoundException({
          success: false,
          message: `Trip sheet dengan ID ${id} tidak ditemukan`,
        });
      }

      if (dto.order_vehicle_id) await this.validateOrderVehicle(dto.order_vehicle_id);
      if (dto.driver_id) await this.validateDriver(dto.driver_id, 'Driver');
      if (dto.assistant_id) await this.validateDriver(dto.assistant_id, 'Assistant driver');

      const resolvedOrderVehicleId = dto.order_vehicle_id ? BigInt(dto.order_vehicle_id) : tripSheet.order_vehicle_id;
      const resolvedDestination = await this.resolveDestinationFromOrderVehicle(resolvedOrderVehicleId);
      const userId = normalizeUserId(user.id);

      const updated = await this.prisma.db.tripSheet.update({
        where: { id: BigInt(id) },
        data: {
          ...(dto.order_vehicle_id !== undefined && { order_vehicle_id: BigInt(dto.order_vehicle_id) }),
          ...(dto.driver_id !== undefined && { driver_id: dto.driver_id ? BigInt(dto.driver_id) : null }),
          ...(dto.assistant_id !== undefined && { assistant_id: dto.assistant_id ? BigInt(dto.assistant_id) : null }),
          destination: resolvedDestination,
          ...(dto.fuel_cost !== undefined && { fuel_cost: toPrismaDecimal(dto.fuel_cost) }),
          ...(dto.toll_fee !== undefined && { toll_fee: toPrismaDecimal(dto.toll_fee) }),
          ...(dto.parking_fee !== undefined && { parking_fee: toPrismaDecimal(dto.parking_fee) }),
          ...(dto.stay_cost !== undefined && { stay_cost: toPrismaDecimal(dto.stay_cost) }),
          ...(dto.others !== undefined && { others: toPrismaDecimal(dto.others) }),
          ...(dto.expense_notes !== undefined && { expense_notes: dto.expense_notes }),
          ...(dto.attachment !== undefined && { attachment: dto.attachment }),
          ...(dto.status !== undefined && { status: dto.status }),
          updated_by: userId,
        },
      });

      return {
        success: true,
        message: 'Trip sheet berhasil diperbarui',
        data: this.serializeTripSheet(updated),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  async findPublic(uuid: string) {
    try {
      const tripSheet = await this.prisma.db.tripSheet.findFirst({
        where: { trip_sheets_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          trip_sheets_uuid: true,
          order_vehicle_id: true,
          driver_id: true,
          assistant_id: true,
          destination: true,
          fuel_cost: true,
          toll_fee: true,
          parking_fee: true,
          stay_cost: true,
          others: true,
          expense_notes: true,
          attachment: true,
          status: true,
          public_submitted_at: true,
          created_at: true,
          updated_at: true,
          orderVehicle: {
            select: {
              id: true,
              order: {
                select: {
                  id: true,
                  order_number: true,
                  customer_name: true,
                  customer_phone: true,
                  pickup_location: true,
                    standby_time: true,
                    start_date: true,
                    finish_date: true,
                    destination: true,
                  dropoff_location: true,
                },
              },
              vehicle: { select: { id: true, plate_number: true, vehicle_type: true } },
            },
          },
          driver: { select: { id: true, name: true } },
          assistant: { select: { id: true, name: true } },
        },
      });

      if (!tripSheet) {
        throw new NotFoundException({
          success: false,
          message: `Trip sheet dengan UUID ${uuid} tidak ditemukan`,
        });
      }

      return {
        success: true,
        message: 'Data trip sheet berhasil diambil',
        data: this.serializeTripSheet(tripSheet),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  async updatePublic(uuid: string, dto: UpdateTripSheetPublicDto) {
    try {
      const tripSheet = await this.prisma.db.tripSheet.findFirst({
        where: { trip_sheets_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          order_vehicle_id: true,
          public_submitted_at: true,
        },
      });

      if (!tripSheet) {
        throw new NotFoundException({
          success: false,
          message: `Trip sheet dengan UUID ${uuid} tidak ditemukan`,
        });
      }

      if (tripSheet.public_submitted_at) {
        throw new BadRequestException({
          success: false,
          message: 'Trip sheet dari link ini sudah pernah diisi dan tidak dapat diubah lagi.',
        });
      }

      if (dto.driver_id) await this.validateDriver(dto.driver_id, 'Driver');
      if (dto.assistant_id) await this.validateDriver(dto.assistant_id, 'Assistant driver');

      const resolvedDestination = await this.resolveDestinationFromOrderVehicle(tripSheet.order_vehicle_id);

      const updated = await this.prisma.db.tripSheet.update({
        where: { id: tripSheet.id },
        data: {
          ...(dto.driver_id !== undefined && { driver_id: dto.driver_id ? BigInt(dto.driver_id) : null }),
          ...(dto.assistant_id !== undefined && { assistant_id: dto.assistant_id ? BigInt(dto.assistant_id) : null }),
          destination: resolvedDestination,
          ...(dto.fuel_cost !== undefined && { fuel_cost: toPrismaDecimal(dto.fuel_cost) }),
          ...(dto.toll_fee !== undefined && { toll_fee: toPrismaDecimal(dto.toll_fee) }),
          ...(dto.parking_fee !== undefined && { parking_fee: toPrismaDecimal(dto.parking_fee) }),
          ...(dto.stay_cost !== undefined && { stay_cost: toPrismaDecimal(dto.stay_cost) }),
          ...(dto.others !== undefined && { others: toPrismaDecimal(dto.others) }),
          ...(dto.expense_notes !== undefined && { expense_notes: dto.expense_notes }),
          ...(dto.attachment !== undefined && { attachment: dto.attachment }),
          ...(dto.status !== undefined && { status: dto.status }),
          public_submitted_at: new Date(),
        },
      });

      return {
        success: true,
        message: 'Trip sheet berhasil diperbarui',
        data: this.serializeTripSheet(updated),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      return this.handleError(error);
    }
  }

  private async validateOrderVehicle(orderVehicleId: string) {
    const exists = await this.prisma.db.orderVehicle.findFirst({
      where: { id: BigInt(orderVehicleId), deleted_at: null },
    });

    if (!exists) {
      throw new NotFoundException({
        success: false,
        message: `Order vehicle dengan ID ${orderVehicleId} tidak ditemukan`,
      });
    }
  }

  private async validateDriver(driverId: string, label: string) {
    const exists = await this.prisma.db.driver.findFirst({
      where: { id: BigInt(driverId), deleted_at: null },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException({
        success: false,
        message: `${label} dengan ID ${driverId} tidak ditemukan`,
      });
    }
  }

  private async resolveDestinationFromOrderVehicle(orderVehicleId?: bigint | null) {
    if (!orderVehicleId)
      return null;

    const orderVehicle = await this.prisma.db.orderVehicle.findFirst({
      where: { id: orderVehicleId, deleted_at: null },
      select: {
        order: {
          select: {
            destination: true,
            dropoff_location: true,
          },
        },
      },
    });

    return orderVehicle?.order?.destination ?? orderVehicle?.order?.dropoff_location ?? null;
  }

  private serializeTripSheet(t: any) {
    return {
      ...t,
      id: t.id?.toString(),
      order_vehicle_id: t.order_vehicle_id?.toString() ?? null,
      driver_id: t.driver_id?.toString() ?? null,
      assistant_id: t.assistant_id?.toString() ?? null,
      destination: t.destination ?? t.orderVehicle?.order?.destination ?? t.orderVehicle?.order?.dropoff_location ?? null,
      fuel_cost: decimalToMoneyString(t.fuel_cost),
      toll_fee: decimalToMoneyString(t.toll_fee),
      parking_fee: decimalToMoneyString(t.parking_fee),
      stay_cost: decimalToMoneyString(t.stay_cost),
      others: decimalToMoneyString(t.others),
      public_submitted_at: t.public_submitted_at ?? null,
      orderVehicle: t.orderVehicle
        ? {
            ...t.orderVehicle,
            id: t.orderVehicle.id?.toString(),
            order: t.orderVehicle.order ? { ...t.orderVehicle.order, id: t.orderVehicle.order.id.toString() } : null,
            vehicle: t.orderVehicle.vehicle ? { ...t.orderVehicle.vehicle, id: t.orderVehicle.vehicle.id.toString() } : null,
          }
        : undefined,
      driver: t.driver ? { ...t.driver, id: t.driver.id.toString() } : (t.driver ?? null),
      assistant: t.assistant ? { ...t.assistant, id: t.assistant.id.toString() } : (t.assistant ?? null),
    };
  }

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

