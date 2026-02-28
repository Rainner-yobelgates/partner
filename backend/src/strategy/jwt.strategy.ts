// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET') || 'supersecret',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.db.user.findFirst({
      where: {
        id: BigInt(payload.sub),
        deleted_at: null,
      },
      select: {
        id: true,
        users_uuid: true,
        username: true,
        email: true,
        status: true,
        role_id: true,
        role: {
          select: {
            id: true,
            role_uuid: true,
            name: true,
            status: true,
          },
        },
        created_at: true,
        updated_at: true,
        // password: false ← tidak di-select otomatis tidak ikut
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        success: false,
        message: 'User tidak ditemukan atau token tidak valid',
      });
    }

    // Serialize BigInt sebelum disimpan ke request.user
    return {
      ...user,
      id: user.id.toString(),
      role_id: user.role_id?.toString() ?? null,
      role: user.role
        ? {
            ...user.role,
            id: user.role.id.toString(),
          }
        : null,
    };
  }
}