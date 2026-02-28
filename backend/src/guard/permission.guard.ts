import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from 'src/decorator/permission.decorator';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Ambil metadata { resource, action } dari decorator
    const required = this.reflector.getAllAndOverride<{
      resource: string;
      action: string;
    }>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    // Jika endpoint tidak pakai @Permission, langsung lolos
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user; // hasil decode JWT dari JwtAuthGuard

    if (!user) {
      throw new UnauthorizedException({
        success: false,
        message: 'User tidak terautentikasi',
      });
    }

    if (!user.role_id) {
      throw new ForbiddenException({
        success: false,
        message: 'User tidak memiliki role',
      });
    }

    // Cek di RolePermission apakah role user punya permission ini
    const hasPermission = await this.prisma.db.rolePermission.findFirst({
      where: {
        role_id: BigInt(user.role_id),
        deleted_at: null,
        permission: {
          resource: required.resource,
          action: required.action,
          deleted_at: null,
        },
      },
    });

    if (!hasPermission) {
      throw new ForbiddenException({
        success: false,
        message: `Akses ditolak. Permission '${required.resource}:${required.action}' diperlukan`,
      });
    }

    return true;
  }
}