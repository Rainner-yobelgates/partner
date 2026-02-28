import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  CreateRoleDto,
  UpdateRoleDto,
  QueryRoleDto,
} from './dto/role.dto';
import { RolesService } from './role.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { Permission } from 'src/decorator/permission.decorator';
import { PermissionGuard } from 'src/guard/permission.guard';
import { Request } from 'express';
import { CurrentUser, CurrentUserType } from 'src/decorator/current-user.decorator';

@ApiTags('Roles')
@Controller('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // ──────────────────────────────────────────
  // GET ALL
  // ──────────────────────────────────────────
  @Get()
  @Permission('role', 'read')
  @ApiOperation({
    summary: 'Ambil semua role',
    description: 'Menampilkan daftar role dengan pagination, search, dan sorting untuk kebutuhan datatable.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Halaman saat ini' })
  @ApiQuery({ name: 'perPage', required: false, example: '10', description: 'Jumlah data per halaman' })
  @ApiQuery({ name: 'search', required: false, example: 'admin', description: 'Cari berdasarkan name/description' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at', description: 'Field untuk sorting' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc', description: 'Arah sorting' })
  @ApiResponse({
    status: 200,
    description: 'Data role berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data role berhasil diambil',
        data: [
          {
            id: '1',
            role_uuid: '550e8400-e29b-41d4-a716-446655440000',
            name: 'admin',
            description: 'Administrator dengan akses penuh',
            status: 'ACTIVE',
            created_at: '2024-01-15T08:00:00.000Z',
            updated_at: '2024-01-15T08:00:00.000Z',
          },
        ],
        total: 25,
        page: 1,
        perPage: 10,
        totalPages: 3,
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query() query: QueryRoleDto) {
    return this.rolesService.findAll(query);
  }

  // ──────────────────────────────────────────
  // GET ONE BY UUID
  // ──────────────────────────────────────────
  @Get(':uuid')
  @Permission('role', 'detail')
  @ApiOperation({
    summary: 'Ambil detail role by UUID',
    description: 'Menampilkan detail satu role berdasarkan role_uuid.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID role (role_uuid)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail role berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data role berhasil diambil',
        data: {
          id: '1',
          role_uuid: '550e8400-e29b-41d4-a716-446655440000',
          name: 'admin',
          description: 'Administrator dengan akses penuh',
          status: 'ACTIVE',
          created_by: '1',
          updated_by: null,
          created_at: '2024-01-15T08:00:00.000Z',
          updated_at: '2024-01-15T08:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Role tidak ditemukan',
    schema: {
      example: {
        success: false,
        message: 'Role dengan UUID 550e8400-e29b-41d4-a716-446655440000 tidak ditemukan',
      },
    },
  })
  findOne(@Param('uuid') uuid: string) {
    return this.rolesService.findOne(uuid);
  }

  // ──────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────
  @Post()
  @Permission('role', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Buat role baru',
    description: 'Membuat role baru. Field `name` wajib diisi dan harus unik.',
  })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({
    status: 201,
    description: 'Role berhasil dibuat',
    schema: {
      example: {
        success: true,
        message: 'Role berhasil dibuat',
        data: {
          id: '2',
          role_uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          name: 'editor',
          description: 'Dapat mengelola konten',
          status: 'ACTIVE',
          created_at: '2024-01-16T09:00:00.000Z',
          updated_at: '2024-01-16T09:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Nama role sudah digunakan',
    schema: {
      example: {
        success: false,
        message: 'Role dengan nama "editor" sudah ada',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi input gagal',
    schema: {
      example: {
        statusCode: 400,
        message: ['Nama wajib diisi'],
        error: 'Bad Request',
      },
    },
  })
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: CurrentUserType) {
    return this.rolesService.create(dto, user);
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
  @Put(':id')
  @Permission('role', 'update')

  @ApiOperation({
    summary: 'Update role by ID',
    description: 'Memperbarui data role berdasarkan id. Semua field bersifat opsional.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID role (integer)',
    example: 1,
  })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Role berhasil diperbarui',
    schema: {
      example: {
        success: true,
        message: 'Role berhasil diperbarui',
        data: {
          id: '1',
          role_uuid: '550e8400-e29b-41d4-a716-446655440000',
          name: 'superadmin',
          description: 'Super Administrator',
          status: 'ACTIVE',
          updated_by: '1',
          updated_at: '2024-01-17T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Role tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Nama role sudah digunakan' })
  update(@Param('id') id: number, @Body() dto: UpdateRoleDto, @CurrentUser() user: CurrentUserType) {
    return this.rolesService.update(id, dto, user);
  }

  // ──────────────────────────────────────────
  // SOFT DELETE
  // ──────────────────────────────────────────
  @Delete(':id')
  @Permission('role', 'delete')
  @ApiOperation({
    summary: 'Hapus role by ID (soft delete)',
    description: 'Menghapus role secara soft delete berdasarkan id. Data tidak benar-benar dihapus dari database, hanya mengisi `deleted_at` dan `deleted_by`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID role (integer)',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Role berhasil dihapus',
    schema: {
      example: {
        success: true,
        message: 'Role "admin" berhasil dihapus',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Role tidak ditemukan atau sudah dihapus' })
  remove(@Param('id') id: number, @CurrentUser() user: CurrentUserType) {
    return this.rolesService.remove(id, user);
  }
}