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
import { CreateRouteDto, UpdateRouteDto, QueryRouteDto } from './dto/route.dto';
import { RouteService } from './route.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { Permission } from 'src/decorator/permission.decorator';
import { PermissionGuard } from 'src/guard/permission.guard';
import { CurrentUser, CurrentUserType } from 'src/decorator/current-user.decorator';
import { Status } from 'generated/prisma/enums';

@ApiTags('Routes')
@Controller('routes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  // ──────────────────────────────────────────
  // GET ALL
  // ──────────────────────────────────────────
  @Get()
  @Permission('route', 'read')
  @ApiOperation({
    summary: 'Ambil semua rute',
    description:
      'Menampilkan daftar rute dengan pagination, search, filter status, dan sorting untuk kebutuhan datatable.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Halaman saat ini' })
  @ApiQuery({ name: 'perPage', required: false, example: '10', description: 'Jumlah data per halaman' })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'Jakarta',
    description: 'Cari berdasarkan origin / destination',
  })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at', description: 'Field untuk sorting' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc', description: 'Arah sorting' })
  @ApiQuery({ name: 'status', required: false, enum: Status, description: 'Filter berdasarkan status rute' })
  @ApiResponse({
    status: 200,
    description: 'Data rute berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data rute berhasil diambil',
        data: [
          {
            id: '1',
            routes_uuid: '550e8400-e29b-41d4-a716-446655440000',
            origin: 'Jakarta',
            destination: 'Bandung',
            distance: 150.5,
            estimated_time: 180,
            status: 'ACTIVE',
            created_at: '2024-01-15T08:00:00.000Z',
            updated_at: '2024-01-15T08:00:00.000Z',
          },
        ],
        total: 10,
        page: 1,
        perPage: 10,
        totalPages: 1,
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query() query: QueryRouteDto) {
    return this.routeService.findAll(query);
  }

  // ──────────────────────────────────────────
  // GET ONE BY UUID
  // ──────────────────────────────────────────
  @Get(':uuid')
  @Permission('route', 'detail')
  @ApiOperation({
    summary: 'Ambil detail rute by UUID',
    description: 'Menampilkan detail satu rute berdasarkan routes_uuid.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID rute (routes_uuid)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail rute berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data rute berhasil diambil',
        data: {
          id: '1',
          routes_uuid: '550e8400-e29b-41d4-a716-446655440000',
          origin: 'Jakarta',
          destination: 'Bandung',
          distance: 150.5,
          estimated_time: 180,
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
    description: 'Rute tidak ditemukan',
    schema: {
      example: {
        success: false,
        message: 'Rute dengan UUID 550e8400-e29b-41d4-a716-446655440000 tidak ditemukan',
      },
    },
  })
  findOne(@Param('uuid') uuid: string) {
    return this.routeService.findOne(uuid);
  }

  // ──────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────
  @Post()
  @Permission('route', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Buat rute baru',
    description:
      'Membuat rute baru. Kombinasi `origin` + `destination` harus unik (case-insensitive).',
  })
  @ApiBody({ type: CreateRouteDto })
  @ApiResponse({
    status: 201,
    description: 'Rute berhasil dibuat',
    schema: {
      example: {
        success: true,
        message: 'Rute berhasil dibuat',
        data: {
          id: '2',
          routes_uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          origin: 'Surabaya',
          destination: 'Malang',
          distance: 90.0,
          estimated_time: 120,
          status: 'ACTIVE',
          created_at: '2024-01-16T09:00:00.000Z',
          updated_at: '2024-01-16T09:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Kombinasi origin + destination sudah terdaftar',
    schema: {
      example: {
        success: false,
        message: 'Rute dari "Surabaya" ke "Malang" sudah terdaftar',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi input gagal',
    schema: {
      example: {
        statusCode: 400,
        message: ['estimated_time must be a positive number'],
        error: 'Bad Request',
      },
    },
  })
  create(@Body() dto: CreateRouteDto, @CurrentUser() user: CurrentUserType) {
    return this.routeService.create(dto, user);
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
  @Put(':id')
  @Permission('route', 'update')
  @ApiOperation({
    summary: 'Update rute by ID',
    description:
      'Memperbarui data rute berdasarkan id. Semua field bersifat opsional. Kombinasi origin + destination tetap harus unik.',
  })
  @ApiParam({ name: 'id', description: 'ID rute (integer)', example: 1 })
  @ApiBody({ type: UpdateRouteDto })
  @ApiResponse({
    status: 200,
    description: 'Rute berhasil diperbarui',
    schema: {
      example: {
        success: true,
        message: 'Rute berhasil diperbarui',
        data: {
          id: '1',
          routes_uuid: '550e8400-e29b-41d4-a716-446655440000',
          origin: 'Jakarta',
          destination: 'Bandung',
          distance: 160.0,
          estimated_time: 200,
          status: 'ACTIVE',
          updated_by: '1',
          updated_at: '2024-01-17T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Rute tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Kombinasi origin + destination sudah terdaftar' })
  update(
    @Param('id') id: number,
    @Body() dto: UpdateRouteDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.routeService.update(id, dto, user);
  }

  // ──────────────────────────────────────────
  // SOFT DELETE
  // ──────────────────────────────────────────
  @Delete(':id')
  @Permission('route', 'delete')
  @ApiOperation({
    summary: 'Hapus rute by ID (soft delete)',
    description:
      'Menghapus rute secara soft delete. Data tidak benar-benar dihapus dari database, hanya mengisi `deleted_at` dan `deleted_by`.',
  })
  @ApiParam({ name: 'id', description: 'ID rute (integer)', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Rute berhasil dihapus',
    schema: {
      example: {
        success: true,
        message: 'Rute "Jakarta → Bandung" berhasil dihapus',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Rute tidak ditemukan atau sudah dihapus' })
  remove(@Param('id') id: number, @CurrentUser() user: CurrentUserType) {
    return this.routeService.remove(id, user);
  }
}