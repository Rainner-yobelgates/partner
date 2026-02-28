// src/auth/auth.service.ts
import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
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

            return {
                success: true,
                message: 'Login successful',
                data: {
                    access_token: token,
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
}