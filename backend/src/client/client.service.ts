import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Status } from 'generated/prisma/enums';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';
import { normalizePrismaCount } from 'src/utils/pagination-total.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, QueryClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryClientDto) {
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
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { code: { contains: query.search, mode: 'insensitive' as const } },
            { contact_person: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { phone_number: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [data, totalRaw] = await this.prisma.db.$transaction([
        this.prisma.db.client.findMany({
          where,
          skip,
          take: perPage,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            clients_uuid: true,
            name: true,
            code: true,
            contact_person: true,
            phone_number: true,
            email: true,
            address: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        }),
        this.prisma.db.client.count({ where }),
      ]);

      const total = normalizePrismaCount(totalRaw as number | bigint);

      return {
        success: true,
        message: 'Data client berhasil diambil',
        data: data.map((client) => ({ ...client, id: client.id.toString() })),
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
      const client = await this.prisma.db.client.findFirst({
        where: { clients_uuid: uuid, deleted_at: null },
        select: {
          id: true,
          clients_uuid: true,
          name: true,
          code: true,
          contact_person: true,
          phone_number: true,
          email: true,
          address: true,
          status: true,
          created_by: true,
          updated_by: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!client) {
        throw new NotFoundException({
          success: false,
          message: `Client dengan UUID ${uuid} tidak ditemukan`,
        });
      }

      return {
        success: true,
        message: 'Data client berhasil diambil',
        data: {
          ...client,
          id: client.id.toString(),
          created_by: client.created_by?.toString() ?? null,
          updated_by: client.updated_by?.toString() ?? null,
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException)
        throw error;
      return this.handleError(error);
    }
  }

  async create(dto: CreateClientDto, user: CurrentUserType) {
    try {
      const name = dto.name.trim();
      const code = dto.code?.trim() || undefined;

      await this.ensureUniqueName(name);
      if (code)
        await this.ensureUniqueCode(code);

      const userId = normalizeUserId(user.id);

      const client = await this.prisma.db.client.create({
        data: {
          name,
          code,
          contact_person: dto.contact_person,
          phone_number: dto.phone_number,
          email: dto.email,
          address: dto.address,
          status: dto.status ?? Status.ACTIVE,
          created_by: userId,
        },
      });

      return {
        success: true,
        message: 'Client berhasil dibuat',
        data: {
          ...client,
          id: client.id.toString(),
        },
      };
    } catch (error: unknown) {
      if (error instanceof ConflictException)
        throw error;
      return this.handleError(error);
    }
  }

  async update(id: number, dto: UpdateClientDto, user: CurrentUserType) {
    try {
      const client = await this.prisma.db.client.findFirst({
        where: { id: BigInt(id), deleted_at: null },
      });

      if (!client) {
        throw new NotFoundException({
          success: false,
          message: `Client dengan ID ${id} tidak ditemukan`,
        });
      }

      const nextName = dto.name?.trim();
      const nextCode = dto.code?.trim();

      if (nextName && nextName !== client.name)
        await this.ensureUniqueName(nextName, BigInt(id));

      if (nextCode !== undefined && nextCode !== (client.code ?? undefined) && nextCode !== '')
        await this.ensureUniqueCode(nextCode, BigInt(id));

      const userId = normalizeUserId(user.id);

      const updated = await this.prisma.db.client.update({
        where: { id: BigInt(id) },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.code !== undefined && { code: dto.code.trim() || null }),
          ...(dto.contact_person !== undefined && { contact_person: dto.contact_person }),
          ...(dto.phone_number !== undefined && { phone_number: dto.phone_number }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.status !== undefined && { status: dto.status }),
          updated_by: userId,
        },
      });

      return {
        success: true,
        message: 'Client berhasil diperbarui',
        data: {
          ...updated,
          id: updated.id.toString(),
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
      const client = await this.prisma.db.client.findFirst({
        where: { id: BigInt(id), deleted_at: null },
        select: { id: true, name: true },
      });

      if (!client) {
        throw new NotFoundException({
          success: false,
          message: `Client dengan ID ${id} tidak ditemukan atau sudah dihapus`,
        });
      }

      const userId = normalizeUserId(user.id);

      await this.prisma.db.client.update({
        where: { id: BigInt(id) },
        data: {
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });

      return {
        success: true,
        message: `Client "${client.name}" berhasil dihapus`,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException)
        throw error;
      return this.handleError(error);
    }
  }

  private async ensureUniqueName(name: string, excludeId?: bigint) {
    const exists = await this.prisma.db.client.findFirst({
      where: {
        deleted_at: null,
        name,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (exists) {
      throw new ConflictException({
        success: false,
        message: `Client dengan nama "${name}" sudah terdaftar`,
      });
    }
  }

  private async ensureUniqueCode(code: string, excludeId?: bigint) {
    const exists = await this.prisma.db.client.findFirst({
      where: {
        deleted_at: null,
        code,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (exists) {
      throw new ConflictException({
        success: false,
        message: `Client dengan kode "${code}" sudah terdaftar`,
      });
    }
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
