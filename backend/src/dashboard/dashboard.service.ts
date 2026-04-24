import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { decimalToMoneyString } from 'src/utils/money.util';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

type MonthlyBucket = {
  month: number;
  label: string;
  revenue: string;
  expense: string;
  profit: string;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(yearInput?: number, clientIdInput?: string) {
    const year = yearInput ?? new Date().getFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));

    let clientId: bigint | null = null;
    let clientMeta: { id: string; name: string; code: string | null } | null = null;

    if (clientIdInput) {
      clientId = BigInt(clientIdInput);
      const client = await this.prisma.db.client.findFirst({
        where: { id: clientId, deleted_at: null },
        select: { id: true, name: true, code: true },
      });

      if (!client) {
        throw new NotFoundException({
          success: false,
          message: `Client dengan ID ${clientIdInput} tidak ditemukan`,
        });
      }

      clientMeta = {
        id: client.id.toString(),
        name: client.name,
        code: client.code ?? null,
      };
    }

    const [masterSummary, reportSummary, clientFinancial, orderFinancial, totalFinancial] = await Promise.all([
      this.getMasterSummary(),
      this.getReportSummary(yearStart, yearEnd, year, clientId),
      this.getClientFinancial(yearStart, yearEnd, year, clientId),
      this.getOrderFinancial(yearStart, yearEnd, year),
      this.getTotalFinancial(yearStart, yearEnd, year, clientId),
    ]);

    return {
      success: true,
      message: 'Ringkasan dashboard berhasil diambil',
      data: {
        filter: {
          year,
          year_from: yearStart.toISOString(),
          year_to_before: yearEnd.toISOString(),
          client_id: clientMeta?.id ?? null,
          client_name: clientMeta?.name ?? null,
          client_code: clientMeta?.code ?? null,
        },
        master_summary: masterSummary,
        report_summary: reportSummary,
        client_financial: clientFinancial,
        order_financial: orderFinancial,
        total_financial: totalFinancial,
      },
    };
  }

  private async getMasterSummary() {
    const [drivers, vehicles, facilities, routes, vehicleServices] = await this.prisma.db.$transaction([
      this.prisma.db.driver.count({ where: { deleted_at: null } }),
      this.prisma.db.vehicle.count({ where: { deleted_at: null } }),
      this.prisma.db.facility.count({ where: { deleted_at: null } }),
      this.prisma.db.route.count({ where: { deleted_at: null } }),
      this.prisma.db.vehicleService.count({ where: { deleted_at: null } }),
    ]);

    return {
      driver_count: drivers,
      vehicle_count: vehicles,
      facility_count: facilities,
      route_count: routes,
      vehicle_service_count: vehicleServices,
    };
  }

  private async getReportSummary(
    yearStart: Date,
    yearEnd: Date,
    year: number,
    clientId: bigint | null,
  ) {
    const shuttleWhere = {
      deleted_at: null,
      ...(clientId ? { client_id: clientId } : {}),
      scheduled_date: {
        not: null,
        gte: yearStart,
        lt: yearEnd,
      },
    } as const;

    const contractWhere = {
      deleted_at: null,
      contract_year: year,
      ...(clientId ? { client_id: clientId } : {}),
    } as const;

    const [shuttleCount, contractCount, clientCount] = await Promise.all([
      this.prisma.db.shuttle.count({ where: shuttleWhere }),
      this.prisma.db.contract.count({ where: contractWhere }),
      this.resolveReportClientCount(yearStart, yearEnd, year, clientId),
    ]);

    return {
      shuttle_count: shuttleCount,
      client_count: clientCount,
      contract_count: contractCount,
    };
  }

  private async resolveReportClientCount(
    yearStart: Date,
    yearEnd: Date,
    year: number,
    clientId: bigint | null,
  ) {
    if (clientId) {
      const exists = await this.prisma.db.client.count({
        where: { id: clientId, deleted_at: null },
      });
      return exists > 0 ? 1 : 0;
    }

    const [contractClientRows, shuttleClientRows] = await Promise.all([
      this.prisma.db.contract.findMany({
        where: { deleted_at: null, contract_year: year },
        distinct: ['client_id'],
        select: { client_id: true },
      }),
      this.prisma.db.shuttle.findMany({
        where: {
          deleted_at: null,
          scheduled_date: {
            not: null,
            gte: yearStart,
            lt: yearEnd,
          },
        },
        distinct: ['client_id'],
        select: { client_id: true },
      }),
    ]);

    const uniqueClientIds = new Set<string>();
    contractClientRows.forEach((row) => uniqueClientIds.add(row.client_id.toString()));
    shuttleClientRows.forEach((row) => uniqueClientIds.add(row.client_id.toString()));

    return uniqueClientIds.size;
  }

  private async getClientFinancial(
    yearStart: Date,
    yearEnd: Date,
    year: number,
    clientId: bigint | null,
  ) {
    const monthlyRevenue = this.createMonthlyDecimals();
    const monthlyExpense = this.createMonthlyDecimals();

    let expenseCrew = new Prisma.Decimal(0);
    let expenseFuel = new Prisma.Decimal(0);
    let expenseToll = new Prisma.Decimal(0);
    let expenseOthers = new Prisma.Decimal(0);

    const contracts = await this.prisma.db.contract.findMany({
      where: {
        deleted_at: null,
        contract_year: year,
        ...(clientId ? { client_id: clientId } : {}),
      },
      select: {
        contract_month: true,
        contract_value: true,
      },
    });

    for (const contract of contracts) {
      const monthIndex = contract.contract_month - 1;
      if (monthIndex < 0 || monthIndex > 11)
        continue;
      monthlyRevenue[monthIndex] = monthlyRevenue[monthIndex].add(this.asDecimal(contract.contract_value));
    }

    const shuttles = await this.prisma.db.shuttle.findMany({
      where: {
        deleted_at: null,
        ...(clientId ? { client_id: clientId } : {}),
        scheduled_date: {
          not: null,
          gte: yearStart,
          lt: yearEnd,
        },
      },
      select: {
        scheduled_date: true,
        crew_incentive: true,
        fuel: true,
        toll_fee: true,
        others: true,
      },
    });

    for (const shuttle of shuttles) {
      if (!shuttle.scheduled_date)
        continue;

      const monthIndex = shuttle.scheduled_date.getUTCMonth();
      const crew = this.asDecimal(shuttle.crew_incentive);
      const fuel = this.asDecimal(shuttle.fuel);
      const toll = this.asDecimal(shuttle.toll_fee);
      const others = this.asDecimal(shuttle.others);
      const total = crew.add(fuel).add(toll).add(others);

      monthlyExpense[monthIndex] = monthlyExpense[monthIndex].add(total);

      expenseCrew = expenseCrew.add(crew);
      expenseFuel = expenseFuel.add(fuel);
      expenseToll = expenseToll.add(toll);
      expenseOthers = expenseOthers.add(others);
    }

    const monthly = this.buildMonthlyBuckets(monthlyRevenue, monthlyExpense);
    const totals = this.calculateTotals(monthlyRevenue, monthlyExpense);

    const expenseBreakdownTotal = expenseCrew.add(expenseFuel).add(expenseToll).add(expenseOthers);

    return {
      monthly,
      totals,
      expense_breakdown: {
        crew_incentive: decimalToMoneyString(expenseCrew),
        fuel: decimalToMoneyString(expenseFuel),
        toll_fee: decimalToMoneyString(expenseToll),
        others: decimalToMoneyString(expenseOthers),
        total: decimalToMoneyString(expenseBreakdownTotal),
      },
    };
  }

  private async getOrderFinancial(yearStart: Date, yearEnd: Date, year: number) {
    const monthlyRevenue = this.createMonthlyDecimals();
    const monthlyExpense = this.createMonthlyDecimals();

    let expenseFuel = new Prisma.Decimal(0);
    let expenseToll = new Prisma.Decimal(0);
    let expenseParking = new Prisma.Decimal(0);
    let expenseStay = new Prisma.Decimal(0);
    let expenseOthers = new Prisma.Decimal(0);

    const orders = await this.prisma.db.order.findMany({
      where: {
        deleted_at: null,
        created_at: {
          gte: yearStart,
          lt: yearEnd,
        },
      },
      select: {
        id: true,
        created_at: true,
        total_amount: true,
      },
    });

    for (const order of orders) {
      const monthIndex = order.created_at.getUTCMonth();
      monthlyRevenue[monthIndex] = monthlyRevenue[monthIndex].add(this.asDecimal(order.total_amount));
    }

    const tripSheets = await this.prisma.db.tripSheet.findMany({
      where: {
        deleted_at: null,
        orderVehicle: {
          deleted_at: null,
          order: {
            deleted_at: null,
            created_at: {
              gte: yearStart,
              lt: yearEnd,
            },
          },
        },
      },
      select: {
        fuel_cost: true,
        toll_fee: true,
        parking_fee: true,
        stay_cost: true,
        others: true,
        orderVehicle: {
          select: {
            order: {
              select: {
                created_at: true,
              },
            },
          },
        },
      },
    });

    for (const tripSheet of tripSheets) {
      const orderCreatedAt = tripSheet.orderVehicle?.order?.created_at;
      if (!orderCreatedAt)
        continue;

      const monthIndex = orderCreatedAt.getUTCMonth();
      const fuel = this.asDecimal(tripSheet.fuel_cost);
      const toll = this.asDecimal(tripSheet.toll_fee);
      const parking = this.asDecimal(tripSheet.parking_fee);
      const stay = this.asDecimal(tripSheet.stay_cost);
      const others = this.asDecimal(tripSheet.others);
      const total = fuel.add(toll).add(parking).add(stay).add(others);

      monthlyExpense[monthIndex] = monthlyExpense[monthIndex].add(total);

      expenseFuel = expenseFuel.add(fuel);
      expenseToll = expenseToll.add(toll);
      expenseParking = expenseParking.add(parking);
      expenseStay = expenseStay.add(stay);
      expenseOthers = expenseOthers.add(others);
    }

    const monthly = this.buildMonthlyBuckets(monthlyRevenue, monthlyExpense);
    const totals = this.calculateTotals(monthlyRevenue, monthlyExpense);

    const expenseBreakdownTotal = expenseFuel
      .add(expenseToll)
      .add(expenseParking)
      .add(expenseStay)
      .add(expenseOthers);

    return {
      summary: {
        order_count: orders.length,
        ...totals,
      },
      monthly,
      expense_breakdown: {
        fuel_cost: decimalToMoneyString(expenseFuel),
        toll_fee: decimalToMoneyString(expenseToll),
        parking_fee: decimalToMoneyString(expenseParking),
        stay_cost: decimalToMoneyString(expenseStay),
        others: decimalToMoneyString(expenseOthers),
        total: decimalToMoneyString(expenseBreakdownTotal),
      },
      filter: {
        year,
        created_from: yearStart.toISOString(),
        created_to_before: yearEnd.toISOString(),
      },
    };
  }

  private async getTotalFinancial(
    yearStart: Date,
    yearEnd: Date,
    year: number,
    clientId: bigint | null,
  ) {
    const monthlyRevenue = this.createMonthlyDecimals();
    const monthlyExpense = this.createMonthlyDecimals();

    let revenueContract = new Prisma.Decimal(0);
    let revenueOrder = new Prisma.Decimal(0);

    let expenseClientAjk = new Prisma.Decimal(0);
    let expenseOrderReservasi = new Prisma.Decimal(0);
    let expenseVehicleService = new Prisma.Decimal(0);
    let expenseFacility = new Prisma.Decimal(0);

    const contracts = await this.prisma.db.contract.findMany({
      where: {
        deleted_at: null,
        contract_year: year,
        ...(clientId ? { client_id: clientId } : {}),
      },
      select: {
        contract_month: true,
        contract_value: true,
      },
    });

    for (const contract of contracts) {
      const monthIndex = contract.contract_month - 1;
      if (monthIndex < 0 || monthIndex > 11)
        continue;

      const value = this.asDecimal(contract.contract_value);
      monthlyRevenue[monthIndex] = monthlyRevenue[monthIndex].add(value);
      revenueContract = revenueContract.add(value);
    }

    const orders = await this.prisma.db.order.findMany({
      where: {
        deleted_at: null,
        created_at: {
          gte: yearStart,
          lt: yearEnd,
        },
      },
      select: {
        created_at: true,
        total_amount: true,
      },
    });

    for (const order of orders) {
      const monthIndex = order.created_at.getUTCMonth();
      const value = this.asDecimal(order.total_amount);
      monthlyRevenue[monthIndex] = monthlyRevenue[monthIndex].add(value);
      revenueOrder = revenueOrder.add(value);
    }

    const shuttles = await this.prisma.db.shuttle.findMany({
      where: {
        deleted_at: null,
        ...(clientId ? { client_id: clientId } : {}),
        scheduled_date: {
          not: null,
          gte: yearStart,
          lt: yearEnd,
        },
      },
      select: {
        scheduled_date: true,
        crew_incentive: true,
        fuel: true,
        toll_fee: true,
        others: true,
      },
    });

    for (const shuttle of shuttles) {
      if (!shuttle.scheduled_date)
        continue;

      const monthIndex = shuttle.scheduled_date.getUTCMonth();
      const total = this
        .asDecimal(shuttle.crew_incentive)
        .add(this.asDecimal(shuttle.fuel))
        .add(this.asDecimal(shuttle.toll_fee))
        .add(this.asDecimal(shuttle.others));

      monthlyExpense[monthIndex] = monthlyExpense[monthIndex].add(total);
      expenseClientAjk = expenseClientAjk.add(total);
    }

    const tripSheets = await this.prisma.db.tripSheet.findMany({
      where: {
        deleted_at: null,
        orderVehicle: {
          deleted_at: null,
          order: {
            deleted_at: null,
            created_at: {
              gte: yearStart,
              lt: yearEnd,
            },
          },
        },
      },
      select: {
        fuel_cost: true,
        toll_fee: true,
        parking_fee: true,
        stay_cost: true,
        others: true,
        orderVehicle: {
          select: {
            order: {
              select: {
                created_at: true,
              },
            },
          },
        },
      },
    });

    for (const tripSheet of tripSheets) {
      const orderCreatedAt = tripSheet.orderVehicle?.order?.created_at;
      if (!orderCreatedAt)
        continue;

      const monthIndex = orderCreatedAt.getUTCMonth();
      const total = this
        .asDecimal(tripSheet.fuel_cost)
        .add(this.asDecimal(tripSheet.toll_fee))
        .add(this.asDecimal(tripSheet.parking_fee))
        .add(this.asDecimal(tripSheet.stay_cost))
        .add(this.asDecimal(tripSheet.others));

      monthlyExpense[monthIndex] = monthlyExpense[monthIndex].add(total);
      expenseOrderReservasi = expenseOrderReservasi.add(total);
    }

    const vehicleServices = await this.prisma.db.vehicleService.findMany({
      where: {
        deleted_at: null,
        OR: [
          {
            service_date: {
              not: null,
              gte: yearStart,
              lt: yearEnd,
            },
          },
          {
            service_date: null,
            created_at: {
              gte: yearStart,
              lt: yearEnd,
            },
          },
        ],
      },
      select: {
        service_date: true,
        created_at: true,
        cost: true,
      },
    });

    for (const service of vehicleServices) {
      const referenceDate = service.service_date ?? service.created_at;
      const monthIndex = referenceDate.getUTCMonth();
      const value = this.asDecimal(service.cost);

      monthlyExpense[monthIndex] = monthlyExpense[monthIndex].add(value);
      expenseVehicleService = expenseVehicleService.add(value);
    }

    const facilities = await this.prisma.db.facility.findMany({
      where: {
        deleted_at: null,
        created_at: {
          gte: yearStart,
          lt: yearEnd,
        },
      },
      select: {
        created_at: true,
        cost: true,
      },
    });

    for (const facility of facilities) {
      const monthIndex = facility.created_at.getUTCMonth();
      const value = this.asDecimal(facility.cost);

      monthlyExpense[monthIndex] = monthlyExpense[monthIndex].add(value);
      expenseFacility = expenseFacility.add(value);
    }

    const monthly = this.buildMonthlyBuckets(monthlyRevenue, monthlyExpense);
    const totals = this.calculateTotals(monthlyRevenue, monthlyExpense);

    return {
      monthly,
      totals,
      revenue_breakdown: {
        contract: decimalToMoneyString(revenueContract),
        reservasi: decimalToMoneyString(revenueOrder),
        total: decimalToMoneyString(revenueContract.add(revenueOrder)),
      },
      expense_breakdown: {
        client_ajk: decimalToMoneyString(expenseClientAjk),
        reservasi: decimalToMoneyString(expenseOrderReservasi),
        vehicle_service: decimalToMoneyString(expenseVehicleService),
        facility: decimalToMoneyString(expenseFacility),
        total: decimalToMoneyString(
          expenseClientAjk.add(expenseOrderReservasi).add(expenseVehicleService).add(expenseFacility),
        ),
      },
      filter: {
        year,
        year_from: yearStart.toISOString(),
        year_to_before: yearEnd.toISOString(),
        client_id: clientId ? clientId.toString() : null,
      },
    };
  }

  private createMonthlyDecimals() {
    return Array.from({ length: 12 }, () => new Prisma.Decimal(0));
  }

  private asDecimal(value: Prisma.Decimal | string | number | null | undefined) {
    if (value === null || value === undefined)
      return new Prisma.Decimal(0);
    return new Prisma.Decimal(value as any);
  }

  private buildMonthlyBuckets(
    monthlyRevenue: Prisma.Decimal[],
    monthlyExpense: Prisma.Decimal[],
  ): MonthlyBucket[] {
    const rows: MonthlyBucket[] = [];
    for (let i = 0; i < 12; i += 1) {
      const revenue = monthlyRevenue[i];
      const expense = monthlyExpense[i];
      const profit = revenue.sub(expense);
      rows.push({
        month: i + 1,
        label: MONTH_LABELS[i],
        revenue: decimalToMoneyString(revenue) ?? '0.00',
        expense: decimalToMoneyString(expense) ?? '0.00',
        profit: decimalToMoneyString(profit) ?? '0.00',
      });
    }
    return rows;
  }

  private calculateTotals(monthlyRevenue: Prisma.Decimal[], monthlyExpense: Prisma.Decimal[]) {
    const totalRevenue = monthlyRevenue.reduce((sum, value) => sum.add(value), new Prisma.Decimal(0));
    const totalExpense = monthlyExpense.reduce((sum, value) => sum.add(value), new Prisma.Decimal(0));
    const totalProfit = totalRevenue.sub(totalExpense);

    return {
      total_revenue: decimalToMoneyString(totalRevenue),
      total_expense: decimalToMoneyString(totalExpense),
      total_profit: decimalToMoneyString(totalProfit),
    };
  }
}
