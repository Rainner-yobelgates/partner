import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, QueryRoleDto, UpdateRoleDto } from './dto/role.dto';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';

@Injectable()
export class RolesService {
    constructor(private readonly prisma: PrismaService) {}

    // ──────────────────────────────────────────
    // GET ALL (Pagination + Datatable)
    // ──────────────────────────────────────────
    async findAll(query: QueryRoleDto) {
        const page = Number(query.page) || 1;
        const perPage = Number(query.perPage) || 10;
        const skip = (page - 1) * perPage;
        const sortBy = query.sortBy || 'created_at';
        const sortOrder = query.sortOrder || 'desc';

        try {
            const [data, total] = await this.prisma.db.$transaction([
                this.prisma.db.role.findMany({
                where: {
                    deleted_at: null,
                    ...(query.search && {
                    OR: [
                        { name: { contains: query.search, mode: 'insensitive' } },
                        { description: { contains: query.search, mode: 'insensitive' } },
                    ],
                    }),
                },
                skip,
                take: perPage,
                orderBy: { [sortBy]: sortOrder },
                select: {
                    id: true,
                    role_uuid: true,
                    name: true,
                    description: true,
                    status: true,
                    created_at: true,
                    updated_at: true,
                },
                }),
                this.prisma.db.role.count({
                    where: {
                        deleted_at: null,
                        ...(query.search && {
                        OR: [
                            { name: { contains: query.search, mode: 'insensitive' } },
                            { description: { contains: query.search, mode: 'insensitive' } },
                        ],
                        }),
                    },
                }),
            ]);

            return {
                success: true,
                message: 'Data role berhasil diambil',
                data: data.map((r) => ({ ...r, id: r.id.toString() })),
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            };
        } catch (error: unknown) {
            // Error dari DTO (class-validator)
            if (error instanceof Array) {
                // NestJS ValidationPipe bisa melempar array error string
                return {
                success: false,
                message: 'Validation failed',
                errors: error, // array bisa langsung dikirim ke frontend
                };
            }

            // Error instance
            if (error instanceof Error) {
                // Prisma / bcrypt / runtime errors
                return {
                    success: false,
                    message: 'Login failed',
                    error: error.message,
                };
            }

            // Fallback unknown error
            return {
                success: false,
                message: 'Login failed',
                error: 'Unknown error',
            };
        }
    }

    // ──────────────────────────────────────────
    // GET ONE
    // ──────────────────────────────────────────
    async findOne(uuid: string) {
        try {
            const role = await this.prisma.db.role.findFirst({
                where: { role_uuid: uuid, deleted_at: null },
                select: {
                    id: true,
                    role_uuid: true,
                    name: true,
                    description: true,
                    status: true,
                    created_by: true,
                    updated_by: true,
                    created_at: true,
                    updated_at: true,
                },
            });

            if (!role) {
                throw new NotFoundException({
                    success: false,
                    message: `Role dengan UUID ${uuid} tidak ditemukan`,
                });
            }

            return {
                success: true,
                message: 'Data role berhasil diambil',
                data: { ...role, id: role.id.toString() },
            };
        } catch (error: unknown) {
            // Unauthorized tetap dilempar agar status 401
            if (error instanceof NotFoundException) throw error;

            // Error dari DTO (class-validator)
            if (error instanceof Array) {
                // NestJS ValidationPipe bisa melempar array error string
                return {
                success: false,
                message: 'Validation failed',
                errors: error, // array bisa langsung dikirim ke frontend
                };
            }

            // Error instance
            if (error instanceof Error) {
                // Prisma / bcrypt / runtime errors
                return {
                    success: false,
                    message: 'Login failed',
                    error: error.message,
                };
            }

            // Fallback unknown error
            return {
                success: false,
                message: 'Login failed',
                error: 'Unknown error',
            };
        }
    }

    // ──────────────────────────────────────────
    // CREATE
    // ──────────────────────────────────────────
    async create(dto: CreateRoleDto, user: CurrentUserType) {
        try {
        // Cek nama duplikat
        const exists = await this.prisma.db.role.findUnique({
            where: { name: dto.name },
        });
        if (exists) {
            throw new ConflictException({
            success: false,
            message: `Role dengan nama "${dto.name}" sudah ada`,
            });
        }
        const userId = normalizeUserId(user.id);
        const role = await this.prisma.db.role.create({
            data: {
                name: dto.name,
                description: dto.description,
                status: dto.status,
                created_by: userId,
            },
        });

        return {
            success: true,
            message: 'Role berhasil dibuat',
            data: { ...role, id: role.id.toString() },
        };
        } catch (error: unknown) {
            // Unauthorized tetap dilempar agar status 401
            if (error instanceof ConflictException) throw error;

            // Error dari DTO (class-validator)
            if (error instanceof Array) {
                // NestJS ValidationPipe bisa melempar array error string
                return {
                success: false,
                message: 'Validation failed',
                errors: error, // array bisa langsung dikirim ke frontend
                };
            }

            // Error instance
            if (error instanceof Error) {
                // Prisma / bcrypt / runtime errors
                return {
                    success: false,
                    message: 'Login failed',
                    error: error.message,
                };
            }

            // Fallback unknown error
            return {
                success: false,
                message: 'Login failed',
                error: 'Unknown error',
            };
        }
    }

    // ──────────────────────────────────────────
    // UPDATE
    // ──────────────────────────────────────────
    async update(id: number, dto: UpdateRoleDto, user: CurrentUserType) {
        try {
            const role = await this.prisma.db.role.findFirst({
                where: { id: BigInt(id), deleted_at: null },
            });

            if (!role) {
                throw new NotFoundException({
                success: false,
                message: `Role dengan ID ${id} tidak ditemukan`,
                });
            }

            // Cek nama duplikat (kecuali role ini sendiri)
            if (dto.name && dto.name !== role.name) {
                const exists = await this.prisma.db.role.findFirst({
                where: { name: dto.name, NOT: { id: BigInt(id) } },
                });
                if (exists) {
                throw new ConflictException({
                    success: false,
                    message: `Role dengan nama "${dto.name}" sudah ada`,
                });
                }
            }
            const userId = normalizeUserId(user.id);
            const updated = await this.prisma.db.role.update({
                where: { id: BigInt(id) },
                data: {
                    ...(dto.name && { name: dto.name }),
                    ...(dto.description !== undefined && { description: dto.description }),
                    ...(dto.status && { status: dto.status }),
                    updated_by: userId,
                },
            });

            return {
                success: true,
                message: 'Role berhasil diperbarui',
                data: { ...updated, id: updated.id.toString() },
            };
        } catch (error: unknown) {
            // Unauthorized tetap dilempar agar status 401
            if (error instanceof NotFoundException || error instanceof ConflictException) throw error;

            // Error dari DTO (class-validator)
            if (error instanceof Array) {
                // NestJS ValidationPipe bisa melempar array error string
                return {
                success: false,
                message: 'Validation failed',
                errors: error, // array bisa langsung dikirim ke frontend
                };
            }

            // Error instance
            if (error instanceof Error) {
                // Prisma / bcrypt / runtime errors
                return {
                    success: false,
                    message: 'Login failed',
                    error: error.message,
                };
            }

            // Fallback unknown error
            return {
                success: false,
                message: 'Login failed',
                error: 'Unknown error',
            };
        }
    }

    // ──────────────────────────────────────────
    // SOFT DELETE
    // ──────────────────────────────────────────
    async remove(id: number,  user: CurrentUserType) {
        try {
            const role = await this.prisma.db.role.findFirst({
                where: { id: BigInt(id), deleted_at: null },
            });

            if (!role) {
                throw new NotFoundException({
                    success: false,
                    message: `Role dengan ID ${id} tidak ditemukan atau sudah dihapus`,
                });
            }

            const userId = normalizeUserId(user.id);

            await this.prisma.db.role.update({
                where: { id: BigInt(id) },
                data: {
                deleted_at: new Date(),
                deleted_by: userId,
                },
            });

            return {
                success: true,
                message: `Role "${role.name}" berhasil dihapus`,
            };
        } catch (error: unknown) {
            // Unauthorized tetap dilempar agar status 401
            if (error instanceof NotFoundException) throw error;

            // Error dari DTO (class-validator)
            if (error instanceof Array) {
                // NestJS ValidationPipe bisa melempar array error string
                return {
                success: false,
                message: 'Validation failed',
                errors: error, // array bisa langsung dikirim ke frontend
                };
            }

            // Error instance
            if (error instanceof Error) {
                // Prisma / bcrypt / runtime errors
                return {
                    success: false,
                    message: 'Login failed',
                    error: error.message,
                };
            }

            // Fallback unknown error
            return {
                success: false,
                message: 'Login failed',
                error: 'Unknown error',
            };
        }
    }
}