import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { Status } from 'generated/prisma/enums';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';
import { normalizePrismaCount } from 'src/utils/pagination-total.util';
import { decimalToMoneyString, toPrismaDecimal } from 'src/utils/money.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto, QueryContractDto, UpdateContractDto } from './dto/contract.dto';

const CONTRACT_LIST_SORT_FIELDS = ['created_at', 'updated_at', 'contract_number', 'contract_month', 'contract_year', 'status'] as const;

@Injectable()
export class ContractService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryContractDto) {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 10;
    const skip = (page - 1) * perPage;
    const sortBy = CONTRACT_LIST_SORT_FIELDS.includes(query.sortBy as (typeof CONTRACT_LIST_SORT_FIELDS)[number])
      ? query.sortBy!
      : 'created_at';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    try {
      const where = {
        deleted_at: null,
        ...(query.status && { status: query.status }),
        ...(query.client_id && { client_id: BigInt(query.client_id) }),
        ...(query.contract_month && { contract_month: Number(query.contract_month) }),
        ...(query.contract_year && { contract_year: Number(query.contract_year) }),
        ...(query.search && {
          OR: [
            { contract_number: { contains: query.search, mode: 'insensitive' as const } },
            { contact_person: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { phone_number: { contains: query.search, mode: 'insensitive' as const } },
            { client: { name: { contains: query.search, mode: 'insensitive' as const } } },
            { client: { code: { contains: query.search, mode: 'insensitive' as const } } },
          ],
        }),
      };

      const [data, totalRaw] = await this.prisma.db.$transaction([
        this.prisma.db.contract.findMany({
          where,
          skip,
          take: perPage,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            contracts_uuid: true,
            contract_number: true,
            client_id: true,
            contract_month: true,
            contract_year: true,
            contact_person: true,
            phone_number: true,
            email: true,
            address: true,
            contract_value: true,
            status: true,
            created_at: true,
            updated_at: true,
            client: {
              select: {
                id: true,
                clients_uuid: true,
                name: true,
                code: true,
              },
            },
          },
        }),
        this.prisma.db.contract.count({ where }),
      ]);

      const total = normalizePrismaCount(totalRaw as number | bigint);

      return {
        success: true,
        message: 'Data kontrak berhasil diambil',
        data: data.map((contract) => this.serializeContract(contract)),
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
      const contract = await this.prisma.db.contract.findFirst({
        where: { contracts_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          contracts_uuid: true,
          contract_number: true,
          client_id: true,
          contract_month: true,
          contract_year: true,
          contact_person: true,
          phone_number: true,
          email: true,
          address: true,
          contract_value: true,
          status: true,
          created_by: true,
          updated_by: true,
          created_at: true,
          updated_at: true,
          client: {
            select: {
              id: true,
              clients_uuid: true,
              name: true,
              code: true,
            },
          },
        },
      });

      if (!contract) {
        throw new NotFoundException({
          success: false,
          message: `Kontrak dengan UUID ${uuid} tidak ditemukan`,
        });
      }

      return {
        success: true,
        message: 'Data kontrak berhasil diambil',
        data: {
          ...this.serializeContract(contract),
          created_by: contract.created_by?.toString() ?? null,
          updated_by: contract.updated_by?.toString() ?? null,
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException)
        throw error;
      return this.handleError(error);
    }
  }

  async create(dto: CreateContractDto, user: CurrentUserType) {
    try {
      const contractNumber = await this.resolveContractNumber(dto.contract_number);
      const clientId = await this.resolveClientId(dto.client_id);

      await this.ensureUniqueContractPeriod(clientId, dto.contract_month, dto.contract_year);

      const userId = normalizeUserId(user.id);

      const contract = await this.prisma.db.contract.create({
        data: {
          contract_number: contractNumber,
          client_id: clientId,
          contract_month: dto.contract_month,
          contract_year: dto.contract_year,
          contact_person: dto.contact_person,
          phone_number: dto.phone_number,
          email: dto.email,
          address: dto.address,
          contract_value: toPrismaDecimal(dto.contract_value),
          status: dto.status ?? Status.ACTIVE,
          created_by: userId,
        },
        select: {
          id: true,
          contracts_uuid: true,
          contract_number: true,
          client_id: true,
          contract_month: true,
          contract_year: true,
          contact_person: true,
          phone_number: true,
          email: true,
          address: true,
          contract_value: true,
          status: true,
          created_at: true,
          updated_at: true,
          client: {
            select: {
              id: true,
              clients_uuid: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Kontrak berhasil dibuat',
        data: this.serializeContract(contract),
      };
    } catch (error: unknown) {
      if (error instanceof ConflictException || error instanceof NotFoundException)
        throw error;
      return this.handleError(error);
    }
  }

  async update(id: number, dto: UpdateContractDto, user: CurrentUserType) {
    try {
      const contract = await this.prisma.db.contract.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!contract) {
        throw new NotFoundException({
          success: false,
          message: `Kontrak dengan ID ${id} tidak ditemukan`,
        });
      }

      if (dto.contract_number && dto.contract_number !== contract.contract_number) {
        const exists = await this.prisma.db.contract.findFirst({
          where: {
            contract_number: dto.contract_number,
            deleted_at: null,
            NOT: { id: BigInt(id) },
          },
          select: { id: true },
        });

        if (exists) {
          throw new ConflictException({
            success: false,
            message: `Kontrak dengan nomor "${dto.contract_number}" sudah terdaftar`,
          });
        }
      }

      const resolvedClientId = dto.client_id ? await this.resolveClientId(dto.client_id) : contract.client_id;
      const resolvedMonth = dto.contract_month ?? contract.contract_month;
      const resolvedYear = dto.contract_year ?? contract.contract_year;

      await this.ensureUniqueContractPeriod(resolvedClientId, resolvedMonth, resolvedYear, BigInt(id));

      const userId = normalizeUserId(user.id);

      const updated = await this.prisma.db.contract.update({
        where: { id: BigInt(id) },
        data: {
          ...(dto.contract_number !== undefined && { contract_number: dto.contract_number }),
          ...(dto.client_id !== undefined && { client_id: resolvedClientId }),
          ...(dto.contract_month !== undefined && { contract_month: dto.contract_month }),
          ...(dto.contract_year !== undefined && { contract_year: dto.contract_year }),
          ...(dto.contact_person !== undefined && { contact_person: dto.contact_person }),
          ...(dto.phone_number !== undefined && { phone_number: dto.phone_number }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.contract_value !== undefined && { contract_value: toPrismaDecimal(dto.contract_value) }),
          ...(dto.status !== undefined && { status: dto.status }),
          updated_by: userId,
        },
        select: {
          id: true,
          contracts_uuid: true,
          contract_number: true,
          client_id: true,
          contract_month: true,
          contract_year: true,
          contact_person: true,
          phone_number: true,
          email: true,
          address: true,
          contract_value: true,
          status: true,
          created_at: true,
          updated_at: true,
          client: {
            select: {
              id: true,
              clients_uuid: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Kontrak berhasil diperbarui',
        data: this.serializeContract(updated),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ConflictException)
        throw error;
      return this.handleError(error);
    }
  }

  async remove(id: number, user: CurrentUserType) {
    try {
      const contract = await this.prisma.db.contract.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!contract) {
        throw new NotFoundException({
          success: false,
          message: `Kontrak dengan ID ${id} tidak ditemukan atau sudah dihapus`,
        });
      }

      const userId = normalizeUserId(user.id);

      await this.prisma.db.contract.update({
        where: { id: BigInt(id) },
        data: {
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });

      return {
        success: true,
        message: `Kontrak "${contract.contract_number ?? contract.contracts_uuid}" berhasil dihapus`,
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

  private async resolveContractNumber(input?: string) {
    const hasInput = Boolean(input && input.trim());
    let candidate = hasInput ? input!.trim() : this.generateTimestampCode('CTR');
    let attempt = 0;

    while (true) {
      const exists = await this.prisma.db.contract.findFirst({
        where: { contract_number: candidate, deleted_at: null },
        select: { id: true },
      });

      if (!exists)
        return candidate;

      if (hasInput) {
        throw new ConflictException({
          success: false,
          message: `Kontrak dengan nomor "${candidate}" sudah terdaftar`,
        });
      }

      attempt += 1;
      if (attempt > 5) {
        throw new ConflictException({
          success: false,
          message: 'Gagal menghasilkan nomor kontrak unik. Coba lagi.',
        });
      }

      candidate = this.generateTimestampCode('CTR');
    }
  }

  private async resolveClientId(input: string) {
    const clientId = BigInt(input);
    const client = await this.prisma.db.client.findFirst({
      where: { id: clientId, deleted_at: null },
      select: { id: true },
    });

    if (!client) {
      throw new NotFoundException({
        success: false,
        message: `Client dengan ID ${input} tidak ditemukan`,
      });
    }

    return clientId;
  }

  private async ensureUniqueContractPeriod(clientId: bigint, month: number, year: number, excludeId?: bigint) {
    const exists = await this.prisma.db.contract.findFirst({
      where: {
        deleted_at: null,
        client_id: clientId,
        contract_month: month,
        contract_year: year,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (exists) {
      throw new ConflictException({
        success: false,
        message: `Kontrak client pada periode ${month}/${year} sudah terdaftar`,
      });
    }
  }

  async recapClientOptions() {
    try {
      const clients = await this.prisma.db.client.findMany({
        where: { deleted_at: null },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          clients_uuid: true,
          name: true,
          code: true,
        },
      });

      return {
        success: true,
        message: 'Daftar client rekap berhasil diambil',
        data: clients.map((client) => ({
          id: client.id.toString(),
          clients_uuid: client.clients_uuid,
          name: client.name,
          code: client.code ?? null,
        })),
      };
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  async defaultRecapSelection() {
    try {
      const select = {
        id: true,
        contract_number: true,
        client_id: true,
        contract_month: true,
        contract_year: true,
        client: { select: { id: true, name: true, code: true } },
      } as const;

      let contract = await this.prisma.db.contract.findFirst({
        where: { deleted_at: null, status: Status.ACTIVE },
        orderBy: [{ contract_year: 'desc' }, { contract_month: 'desc' }, { created_at: 'desc' }],
        select,
      });

      if (!contract) {
        contract = await this.prisma.db.contract.findFirst({
          where: { deleted_at: null },
          orderBy: [{ contract_year: 'desc' }, { contract_month: 'desc' }, { created_at: 'desc' }],
          select,
        });
      }

      if (!contract) {
        return {
          success: true,
          message: 'Belum ada kontrak',
          data: null,
        };
      }

      return {
        success: true,
        message: 'Default rekap klien diperoleh',
        data: {
          client_id: contract.client_id.toString(),
          client_name: contract.client?.name ?? '',
          client_code: contract.client?.code ?? null,
          month: contract.contract_month,
          year: contract.contract_year,
          contract_number: contract.contract_number,
        },
      };
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  async recapByClientMonthYear(clientIdInput: string, monthInput: number, yearInput: number) {
    try {
      if (!Number.isInteger(monthInput) || monthInput < 1 || monthInput > 12) {
        throw new BadRequestException({
          success: false,
          message: 'month harus angka 1-12',
        });
      }

      if (!Number.isInteger(yearInput) || yearInput < 2000 || yearInput > 2100) {
        throw new BadRequestException({
          success: false,
          message: 'year harus angka 2000-2100',
        });
      }

      const clientId = BigInt(clientIdInput);
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

      const contract = await this.prisma.db.contract.findFirst({
        where: {
          client_id: clientId,
          contract_month: monthInput,
          contract_year: yearInput,
          deleted_at: null,
        },
        orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
        select: {
          id: true,
          client_id: true,
          contract_number: true,
          contract_month: true,
          contract_year: true,
          contract_value: true,
        },
      });

      const y = yearInput;
      const m = monthInput;
      const periodStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const periodEndExclusive = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));

      const shuttles = await this.prisma.db.shuttle.findMany({
        where: {
          client_id: clientId,
          deleted_at: null,
          scheduled_date: {
            not: null,
            gte: periodStart,
            lt: periodEndExclusive,
          },
        },
        orderBy: { scheduled_date: 'asc' },
        select: {
          id: true,
          shuttles_uuid: true,
          scheduled_date: true,
          status: true,
          crew_incentive: true,
          fuel: true,
          toll_fee: true,
          others: true,
          vehicle: { select: { id: true, plate_number: true, vehicle_type: true } },
          route: { select: { id: true, origin: true, destination: true } },
        },
      });

      let crewIncentive = new Prisma.Decimal(0);
      let fuel = new Prisma.Decimal(0);
      let toll = new Prisma.Decimal(0);
      let others = new Prisma.Decimal(0);
      for (const s of shuttles) {
        if (s.crew_incentive != null)
          crewIncentive = crewIncentive.add(s.crew_incentive);
        if (s.fuel != null)
          fuel = fuel.add(s.fuel);
        if (s.toll_fee != null)
          toll = toll.add(s.toll_fee);
        if (s.others != null)
          others = others.add(s.others);
      }
      const totalExpense = crewIncentive.add(fuel).add(toll).add(others);
      const contractValue = contract?.contract_value ?? new Prisma.Decimal(0);
      const profit = contractValue.sub(totalExpense);

      const monthNames = [
        'Januari',
        'Februari',
        'Maret',
        'April',
        'Mei',
        'Juni',
        'Juli',
        'Agustus',
        'September',
        'Oktober',
        'November',
        'Desember',
      ];
      const periodLabel = `${monthNames[m - 1]} ${y}`;

      const shuttleRows = shuttles.map((s) => {
        const shuttleCrew = s.crew_incentive ?? new Prisma.Decimal(0);
        const shuttleFuel = s.fuel ?? new Prisma.Decimal(0);
        const shuttleToll = s.toll_fee ?? new Prisma.Decimal(0);
        const shuttleOthers = s.others ?? new Prisma.Decimal(0);
        const shuttleTotal = shuttleCrew.add(shuttleFuel).add(shuttleToll).add(shuttleOthers);

        return {
          id: s.id.toString(),
          shuttles_uuid: s.shuttles_uuid,
          scheduled_date: s.scheduled_date,
          status: s.status,
          vehicle_plate_number: s.vehicle?.plate_number ?? null,
          vehicle_type: s.vehicle?.vehicle_type ?? null,
          route_origin: s.route?.origin ?? null,
          route_destination: s.route?.destination ?? null,
          crew_incentive: decimalToMoneyString(shuttleCrew),
          fuel: decimalToMoneyString(shuttleFuel),
          toll_fee: decimalToMoneyString(shuttleToll),
          others: decimalToMoneyString(shuttleOthers),
          total_cost: decimalToMoneyString(shuttleTotal),
        };
      });

      return {
        success: true,
        message: 'Rekap klien berhasil diambil',
        data: {
          client_id: client.id.toString(),
          client_name: client.name,
          client_code: client.code ?? null,
          month: m,
          year: y,
          period_label: periodLabel,
          contract: contract
            ? {
                id: contract.id.toString(),
                contract_number: contract.contract_number ?? null,
                contract_value: decimalToMoneyString(contractValue),
              }
            : null,
          summary: {
            contract_count: contract ? 1 : 0,
            shuttle_trip_count: shuttles.length,
            total_income: decimalToMoneyString(contractValue),
            total_expense: decimalToMoneyString(totalExpense),
            total_profit: decimalToMoneyString(profit),
            expense_crew_incentive: decimalToMoneyString(crewIncentive),
            expense_fuel: decimalToMoneyString(fuel),
            expense_toll: decimalToMoneyString(toll),
            expense_others: decimalToMoneyString(others),
          },
          shuttles: shuttleRows,
          filter: {
            scheduled_from: periodStart.toISOString(),
            scheduled_to_before: periodEndExclusive.toISOString(),
          },
        },
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      return this.handleError(error);
    }
  }

  private serializeContract(contract: any) {
    return {
      ...contract,
      id: contract.id?.toString(),
      client_id: contract.client_id?.toString() ?? null,
      contract_value: decimalToMoneyString(contract.contract_value),
      client: contract.client
        ? {
            ...contract.client,
            id: contract.client.id.toString(),
          }
        : null,
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

