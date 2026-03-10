// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    constructor(
      private prisma: PrismaService,
      private jwtService: JwtService,
    ) {}

    async login(dto: LoginDto) {
        try {
            const user = await this.prisma.db.user.findUnique({
                where: { username: dto.username },
            });

            if (!user) {
            throw new UnauthorizedException('Username not found');
            }

            const passwordValid = await bcrypt.compare(dto.password, user.password);

            if (!passwordValid) {
            throw new UnauthorizedException('Invalid password');
            }

            const payload = {
                sub: user.id.toString(),
                username: user.username,
                role_id: user.role_id?.toString(),
            };

            const token = this.jwtService.sign(payload);
            const permissions = await this.getPermissionsByRoleId(user.role_id?.toString() ?? null);

            return {
                success: true,
                message: 'Login successful',
                data: {
                    access_token: token,
                    role_id: user.role_id?.toString() ?? null,
                    permissions,
                },
            };
        } catch (error: unknown) {
            // Unauthorized tetap dilempar agar status 401
            if (error instanceof UnauthorizedException) throw error;

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

    async getMyPermissions(userId: string) {
        const user = await this.prisma.db.user.findFirst({
            where: {
                id: BigInt(userId),
                deleted_at: null,
            },
            select: {
                id: true,
                role_id: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException('User tidak ditemukan');
        }

        const permissions = await this.getPermissionsByRoleId(user.role_id?.toString() ?? null);

        return {
            success: true,
            message: 'Permissions loaded',
            data: {
                role_id: user.role_id?.toString() ?? null,
                permissions,
            },
        };
    }

    private async getPermissionsByRoleId(roleId: string | null) {
        if (!roleId) {
            return [];
        }

        const rolePermissions = await this.prisma.db.rolePermission.findMany({
            where: {
                role_id: BigInt(roleId),
                deleted_at: null,
                permission: {
                    deleted_at: null,
                },
            },
            select: {
                permission: {
                    select: {
                        resource: true,
                        action: true,
                    },
                },
            },
        });

        return rolePermissions.map(item => `${item.permission.resource}:${item.permission.action}`);
    }
}
