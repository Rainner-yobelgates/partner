import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, QueryRoleDto, UpdateRoleDto } from './dto/role.dto';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';
import { UpdateRolePermissionsDto } from './dto/role-permission.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

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
        data: data.map(r => ({ ...r, id: r.id.toString() })),
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
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  async create(dto: CreateRoleDto, user: CurrentUserType) {
    try {
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
      if (error instanceof ConflictException) throw error;
      return this.handleError(error);
    }
  }

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
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      return this.handleError(error);
    }
  }

  async getPermissionsByRole(roleId: number) {
    const role = await this.prisma.db.role.findFirst({
      where: { id: BigInt(roleId), deleted_at: null },
      select: {
        id: true,
        name: true,
        role_uuid: true,
      },
    });

    if (!role) {
      throw new NotFoundException({
        success: false,
        message: `Role dengan ID ${roleId} tidak ditemukan`,
      });
    }

    const [permissions, activeRolePermissions] = await this.prisma.db.$transaction([
      this.prisma.db.permission.findMany({
        where: { deleted_at: null },
        orderBy: [{ resource: 'asc' }, { action: 'asc' }],
        select: {
          id: true,
          permissions_uuid: true,
          resource: true,
          action: true,
          description: true,
        },
      }),
      this.prisma.db.rolePermission.findMany({
        where: {
          role_id: BigInt(roleId),
          deleted_at: null,
        },
        select: {
          permission_id: true,
        },
      }),
    ]);

    const activePermissionIds = new Set(
      activeRolePermissions.map(item => item.permission_id.toString()),
    );

    return {
      success: true,
      message: 'Data permission role berhasil diambil',
      data: {
        role: {
          id: role.id.toString(),
          role_uuid: role.role_uuid,
          name: role.name,
        },
        permissions: permissions.map(permission => ({
          id: permission.id.toString(),
          permissions_uuid: permission.permissions_uuid,
          resource: permission.resource,
          action: permission.action,
          description: permission.description,
          active: activePermissionIds.has(permission.id.toString()),
        })),
      },
    };
  }

  async updateRolePermissions(
    roleId: number,
    dto: UpdateRolePermissionsDto,
    user: CurrentUserType,
  ) {
    const role = await this.prisma.db.role.findFirst({
      where: { id: BigInt(roleId), deleted_at: null },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException({
        success: false,
        message: `Role dengan ID ${roleId} tidak ditemukan`,
      });
    }

    const permissionIds = [...new Set(dto.permission_ids.map(id => id.trim()).filter(Boolean))];
    const parsedPermissionIds = permissionIds.map(id => BigInt(id));

    const validPermissions = await this.prisma.db.permission.findMany({
      where: {
        id: { in: parsedPermissionIds },
        deleted_at: null,
      },
      select: { id: true },
    });

    if (validPermissions.length !== parsedPermissionIds.length) {
      throw new NotFoundException({
        success: false,
        message: 'Sebagian permission tidak ditemukan',
      });
    }

    const userId = normalizeUserId(user.id);

    await this.prisma.db.$transaction(async tx => {
      await tx.rolePermission.updateMany({
        where: {
          role_id: BigInt(roleId),
          deleted_at: null,
        },
        data: {
          deleted_at: new Date(),
          deleted_by: userId,
          updated_by: userId,
        },
      });

      for (const permissionId of parsedPermissionIds) {
        const existing = await tx.rolePermission.findFirst({
          where: {
            role_id: BigInt(roleId),
            permission_id: permissionId,
          },
          orderBy: { updated_at: 'desc' },
          select: { id: true },
        });

        if (existing) {
          await tx.rolePermission.update({
            where: { id: existing.id },
            data: {
              deleted_at: null,
              deleted_by: null,
              updated_by: userId,
            },
          });
        } else {
          await tx.rolePermission.create({
            data: {
              role_id: BigInt(roleId),
              permission_id: permissionId,
              created_by: userId,
            },
          });
        }
      }
    });

    return this.getPermissionsByRole(roleId);
  }

  async toggleRolePermission(
    roleId: number,
    permissionId: number,
    active: boolean,
    user: CurrentUserType,
  ) {
    const [role, permission] = await this.prisma.db.$transaction([
      this.prisma.db.role.findFirst({
        where: { id: BigInt(roleId), deleted_at: null },
        select: { id: true, name: true },
      }),
      this.prisma.db.permission.findFirst({
        where: { id: BigInt(permissionId), deleted_at: null },
        select: { id: true, resource: true, action: true },
      }),
    ]);

    if (!role) {
      throw new NotFoundException({
        success: false,
        message: `Role dengan ID ${roleId} tidak ditemukan`,
      });
    }

    if (!permission) {
      throw new NotFoundException({
        success: false,
        message: `Permission dengan ID ${permissionId} tidak ditemukan`,
      });
    }

    const userId = normalizeUserId(user.id);
    const roleIdBigInt = BigInt(roleId);
    const permissionIdBigInt = BigInt(permissionId);

    const activeLink = await this.prisma.db.rolePermission.findFirst({
      where: {
        role_id: roleIdBigInt,
        permission_id: permissionIdBigInt,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (active) {
      if (!activeLink) {
        const inactiveLink = await this.prisma.db.rolePermission.findFirst({
          where: {
            role_id: roleIdBigInt,
            permission_id: permissionIdBigInt,
            deleted_at: { not: null },
          },
          orderBy: { updated_at: 'desc' },
          select: { id: true },
        });

        if (inactiveLink) {
          await this.prisma.db.rolePermission.update({
            where: { id: inactiveLink.id },
            data: {
              deleted_at: null,
              deleted_by: null,
              updated_by: userId,
            },
          });
        } else {
          await this.prisma.db.rolePermission.create({
            data: {
              role_id: roleIdBigInt,
              permission_id: permissionIdBigInt,
              created_by: userId,
            },
          });
        }
      }
    } else if (activeLink) {
      await this.prisma.db.rolePermission.update({
        where: { id: activeLink.id },
        data: {
          deleted_at: new Date(),
          deleted_by: userId,
          updated_by: userId,
        },
      });
    }

    return {
      success: true,
      message: `Permission ${permission.resource}:${permission.action} untuk role ${role.name} ${active ? 'diaktifkan' : 'dinonaktifkan'}`,
      data: {
        active,
      },
    };
  }

  async remove(id: number, user: CurrentUserType) {
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
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error);
    }
  }

  private handleError(error: unknown) {
    if (error instanceof Array) {
      return {
        success: false,
        message: 'Validation failed',
        errors: error,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        message: 'Operation failed',
        error: error.message,
      };
    }

    return {
      success: false,
      message: 'Operation failed',
      error: 'Unknown error',
    };
  }
}
