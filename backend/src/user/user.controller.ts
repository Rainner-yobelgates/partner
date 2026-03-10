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
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './dto/user.dto';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { Permission } from 'src/decorator/permission.decorator';
import { PermissionGuard } from 'src/guard/permission.guard';
import { CurrentUser, CurrentUserType } from 'src/decorator/current-user.decorator';
import { Status } from 'generated/prisma/enums';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ──────────────────────────────────────────
  // GET ALL
  // ──────────────────────────────────────────
  @Get()
  @Permission('user', 'read')
  @ApiOperation({
    summary: 'Ambil semua user',
    description:
      'Menampilkan daftar user dengan pagination, search, filter role/status, dan sorting. Password tidak dikembalikan.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Halaman saat ini' })
  @ApiQuery({ name: 'perPage', required: false, example: '10', description: 'Jumlah data per halaman' })
  @ApiQuery({ name: 'search', required: false, example: 'budi', description: 'Cari berdasarkan username / email' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at', description: 'Field untuk sorting' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc', description: 'Arah sorting' })
  @ApiQuery({ name: 'role_id', required: false, example: '1', description: 'Filter berdasarkan ID role' })
  @ApiQuery({ name: 'status', required: false, enum: Status, description: 'Filter berdasarkan status user' })
  @ApiResponse({
    status: 200,
    description: 'Data user berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data user berhasil diambil',
        data: [
          {
            id: '1',
            users_uuid: '550e8400-e29b-41d4-a716-446655440000',
            username: 'budi_santoso',
            email: 'budi@example.com',
            role_id: '1',
            role: { id: '1', name: 'admin' },
            status: 'ACTIVE',
            created_at: '2024-01-15T08:00:00.000Z',
            updated_at: '2024-01-15T08:00:00.000Z',
          },
        ],
        total: 20,
        page: 1,
        perPage: 10,
        totalPages: 2,
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query() query: QueryUserDto) {
    return this.userService.findAll(query);
  }

  // ──────────────────────────────────────────
  // GET ONE BY UUID
  // ──────────────────────────────────────────
  @Get(':uuid')
  @Permission('user', 'detail')
  @ApiOperation({
    summary: 'Ambil detail user by UUID',
    description: 'Menampilkan detail satu user berdasarkan users_uuid. Password tidak dikembalikan.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID user (users_uuid)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail user berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data user berhasil diambil',
        data: {
          id: '1',
          users_uuid: '550e8400-e29b-41d4-a716-446655440000',
          username: 'budi_santoso',
          email: 'budi@example.com',
          role_id: '1',
          role: { id: '1', name: 'admin', description: 'Administrator' },
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
    description: 'User tidak ditemukan',
    schema: {
      example: {
        success: false,
        message: 'User dengan UUID 550e8400-e29b-41d4-a716-446655440000 tidak ditemukan',
      },
    },
  })
  findOne(@Param('uuid') uuid: string) {
    return this.userService.findOne(uuid);
  }

  // ──────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────
  @Post()
  @Permission('user', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Buat user baru',
    description:
      'Membuat user baru. `email` dan `username` harus unik. Password akan di-hash otomatis sebelum disimpan.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User berhasil dibuat',
    schema: {
      example: {
        success: true,
        message: 'User berhasil dibuat',
        data: {
          id: '2',
          users_uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          username: 'siti_rahayu',
          email: 'siti@example.com',
          role_id: '2',
          status: 'ACTIVE',
          created_at: '2024-01-16T09:00:00.000Z',
          updated_at: '2024-01-16T09:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email atau username sudah digunakan',
    schema: {
      example: {
        success: false,
        message: 'Email "siti@example.com" sudah digunakan',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Role tidak ditemukan',
    schema: {
      example: {
        success: false,
        message: 'Role dengan ID 99 tidak ditemukan',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi input gagal',
    schema: {
      example: {
        statusCode: 400,
        message: ['email must be an email', 'password must be longer than or equal to 8 characters'],
        error: 'Bad Request',
      },
    },
  })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: CurrentUserType) {
    return this.userService.create(dto, user);
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
  @Put(':id')
  @Permission('user', 'update')
  @ApiOperation({
    summary: 'Update user by ID',
    description:
      'Memperbarui data user berdasarkan id. Semua field opsional. Jika `password` diberikan, akan di-hash ulang.',
  })
  @ApiParam({ name: 'id', description: 'ID user (integer)', example: 1 })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User berhasil diperbarui',
    schema: {
      example: {
        success: true,
        message: 'User berhasil diperbarui',
        data: {
          id: '1',
          users_uuid: '550e8400-e29b-41d4-a716-446655440000',
          username: 'budi_updated',
          email: 'budi.new@example.com',
          role_id: '2',
          status: 'ACTIVE',
          updated_at: '2024-01-17T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User atau role tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Email atau username sudah digunakan' })
  update(
    @Param('id') id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.userService.update(id, dto, user);
  }

  // ──────────────────────────────────────────
  // SOFT DELETE
  // ──────────────────────────────────────────
  @Delete(':id')
  @Permission('user', 'delete')
  @ApiOperation({
    summary: 'Hapus user by ID (soft delete)',
    description:
      'Menghapus user secara soft delete. Data tidak benar-benar dihapus dari database, hanya mengisi `deleted_at` dan `deleted_by`.',
  })
  @ApiParam({ name: 'id', description: 'ID user (integer)', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'User berhasil dihapus',
    schema: {
      example: {
        success: true,
        message: 'User "budi_santoso" berhasil dihapus',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User tidak ditemukan atau sudah dihapus' })
  remove(@Param('id') id: number, @CurrentUser() user: CurrentUserType) {
    return this.userService.remove(id, user);
  }
}