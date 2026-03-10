import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto, QueryContractDto, UpdateContractDto } from './dto/contract.dto';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';

@Injectable()
export class ContractService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────
  // GET ALL (Pagination + Datatable)
  // ──────────────────────────────────────────
  async findAll(query: QueryContractDto) {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 10;
    const skip = (page - 1) * perPage;
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'desc';

    try {
      const where = {
        deleted_at: null,
        ...(query.status && { status: query.status }),
        // Filter kontrak yang aktif pada tanggal tertentu
        ...(query.active_on && {
          start_date: { lte: new Date(query.active_on) },
          end_date: { gte: new Date(query.active_on) },
        }),
        ...(query.search && {
          OR: [
            { contract_number: { contains: query.search, mode: 'insensitive' as const } },
            { contact_person: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { phone_number: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [data, total] = await this.prisma.db.$transaction([
        this.prisma.db.contract.findMany({
          where,
          skip,
          take: perPage,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            contracts_uuid: true,
            contract_number: true,
            contact_person: true,
            phone_number: true,
            email: true,
            address: true,
            start_date: true,
            end_date: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        }),
        this.prisma.db.contract.count({ where }),
      ]);

      return {
        success: true,
        message: 'Data kontrak berhasil diambil',
        data: data.map((c) => ({ ...c, id: c.id.toString() })),
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
      const contract = await this.prisma.db.contract.findFirst({
        where: { contracts_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          contracts_uuid: true,
          contract_number: true,
          contact_person: true,
          phone_number: true,
          email: true,
          address: true,
          start_date: true,
          end_date: true,
          status: true,
          created_by: true,
          updated_by: true,
          created_at: true,
          updated_at: true,
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
          ...contract,
          id: contract.id.toString(),
          created_by: contract.created_by?.toString() ?? null,
          updated_by: contract.updated_by?.toString() ?? null,
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
  async create(dto: CreateContractDto, user: CurrentUserType) {
    try {
      // Cek contract_number duplikat jika diberikan
      if (dto.contract_number) {
        const exists = await this.prisma.db.contract.findFirst({
          where: { contract_number: dto.contract_number, deleted_at: null },
        });
        if (exists) {
          throw new ConflictException({
            success: false,
            message: `Kontrak dengan nomor "${dto.contract_number}" sudah terdaftar`,
          });
        }
      }

      const userId = normalizeUserId(user.id);

      const contract = await this.prisma.db.contract.create({
        data: {
          contract_number: dto.contract_number,
          contact_person: dto.contact_person,
          phone_number: dto.phone_number,
          email: dto.email,
          address: dto.address,
          start_date: dto.start_date ? new Date(dto.start_date) : undefined,
          end_date: dto.end_date ? new Date(dto.end_date) : undefined,
          status: dto.status,
          created_by: userId,
        },
      });

      return {
        success: true,
        message: 'Kontrak berhasil dibuat',
        data: { ...contract, id: contract.id.toString() },
      };
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      return this.handleError(error);
    }
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
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

      // Cek contract_number duplikat (kecuali kontrak ini sendiri)
      if (dto.contract_number && dto.contract_number !== contract.contract_number) {
        const exists = await this.prisma.db.contract.findFirst({
          where: {
            contract_number: dto.contract_number,
            deleted_at: null,
            NOT: { id: BigInt(id) },
          },
        });
        if (exists) {
          throw new ConflictException({
            success: false,
            message: `Kontrak dengan nomor "${dto.contract_number}" sudah terdaftar`,
          });
        }
      }

      const userId = normalizeUserId(user.id);

      const updated = await this.prisma.db.contract.update({
        where: { id: BigInt(id) },
        data: {
          ...(dto.contract_number !== undefined && { contract_number: dto.contract_number }),
          ...(dto.contact_person !== undefined && { contact_person: dto.contact_person }),
          ...(dto.phone_number !== undefined && { phone_number: dto.phone_number }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.start_date !== undefined && {
            start_date: dto.start_date ? new Date(dto.start_date) : null,
          }),
          ...(dto.end_date !== undefined && {
            end_date: dto.end_date ? new Date(dto.end_date) : null,
          }),
          ...(dto.status !== undefined && { status: dto.status }),
          updated_by: userId,
        },
      });

      return {
        success: true,
        message: 'Kontrak berhasil diperbarui',
        data: { ...updated, id: updated.id.toString() },
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