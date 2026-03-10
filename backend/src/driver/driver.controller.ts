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
import { CreateDriverDto, UpdateDriverDto, QueryDriverDto } from './dto/driver.dto';
import { DriverService } from './driver.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { Permission } from 'src/decorator/permission.decorator';
import { PermissionGuard } from 'src/guard/permission.guard';
import { CurrentUser, CurrentUserType } from 'src/decorator/current-user.decorator';
import { DriverType, Status } from 'generated/prisma/enums';

@ApiTags('Drivers')
@Controller('drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  // ──────────────────────────────────────────
  // GET ALL
  // ──────────────────────────────────────────
  @Get()
  @Permission('driver', 'read')
  @ApiOperation({
    summary: 'Ambil semua driver',
    description:
      'Menampilkan daftar driver dengan pagination, search, filter, dan sorting untuk kebutuhan datatable.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Halaman saat ini' })
  @ApiQuery({ name: 'perPage', required: false, example: '10', description: 'Jumlah data per halaman' })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'Budi',
    description: 'Cari berdasarkan name / phone_number / address',
  })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at', description: 'Field untuk sorting' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc', description: 'Arah sorting' })
  @ApiQuery({ name: 'type', required: false, enum: DriverType, description: 'Filter berdasarkan tipe driver' })
  @ApiQuery({ name: 'status', required: false, enum: Status, description: 'Filter berdasarkan status driver' })
  @ApiResponse({
    status: 200,
    description: 'Data driver berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data driver berhasil diambil',
        data: [
          {
            id: '1',
            drivers_uuid: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Budi Santoso',
            phone_number: '08123456789',
            emergency_contact: '08987654321',
            address: 'Jl. Merdeka No. 1, Jakarta',
            type: 'REGULAR',
            status: 'ACTIVE',
            vehicle_id: '2',
            vehicle: { id: '2', plate_number: 'B 1234 ABC' },
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
  findAll(@Query() query: QueryDriverDto) {
    return this.driverService.findAll(query);
  }

  // ──────────────────────────────────────────
  // GET ONE BY UUID
  // ──────────────────────────────────────────
  @Get(':uuid')
  @Permission('driver', 'detail')
  @ApiOperation({
    summary: 'Ambil detail driver by UUID',
    description: 'Menampilkan detail satu driver berdasarkan drivers_uuid.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID driver (drivers_uuid)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail driver berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data driver berhasil diambil',
        data: {
          id: '1',
          drivers_uuid: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Budi Santoso',
          phone_number: '08123456789',
          emergency_contact: '08987654321',
          address: 'Jl. Merdeka No. 1, Jakarta',
          type: 'REGULAR',
          status: 'ACTIVE',
          vehicle_id: '2',
          vehicle: { id: '2', plate_number: 'B 1234 ABC' },
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
    description: 'Driver tidak ditemukan',
    schema: {
      example: {
        success: false,
        message: 'Driver dengan UUID 550e8400-e29b-41d4-a716-446655440000 tidak ditemukan',
      },
    },
  })
  findOne(@Param('uuid') uuid: string) {
    return this.driverService.findOne(uuid);
  }

  // ──────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────
  @Post()
  @Permission('driver', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Buat driver baru',
    description: 'Membuat driver baru. Field `phone_number` harus unik jika diberikan.',
  })
  @ApiBody({ type: CreateDriverDto })
  @ApiResponse({
    status: 201,
    description: 'Driver berhasil dibuat',
    schema: {
      example: {
        success: true,
        message: 'Driver berhasil dibuat',
        data: {
          id: '3',
          drivers_uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          name: 'Andi Wijaya',
          phone_number: '08111222333',
          emergency_contact: '08444555666',
          address: 'Jl. Sudirman No. 5, Surabaya',
          type: 'FREELANCE',
          status: 'ACTIVE',
          vehicle_id: null,
          created_at: '2024-01-16T09:00:00.000Z',
          updated_at: '2024-01-16T09:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Nomor telepon sudah terdaftar',
    schema: {
      example: {
        success: false,
        message: 'Driver dengan nomor telepon "08111222333" sudah terdaftar',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi input gagal',
    schema: {
      example: {
        statusCode: 400,
        message: ['name must be a string'],
        error: 'Bad Request',
      },
    },
  })
  create(@Body() dto: CreateDriverDto, @CurrentUser() user: CurrentUserType) {
    return this.driverService.create(dto, user);
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
  @Put(':id')
  @Permission('driver', 'update')
  @ApiOperation({
    summary: 'Update driver by ID',
    description: 'Memperbarui data driver berdasarkan id. Semua field bersifat opsional.',
  })
  @ApiParam({ name: 'id', description: 'ID driver (integer)', example: 1 })
  @ApiBody({ type: UpdateDriverDto })
  @ApiResponse({
    status: 200,
    description: 'Driver berhasil diperbarui',
    schema: {
      example: {
        success: true,
        message: 'Driver berhasil diperbarui',
        data: {
          id: '1',
          drivers_uuid: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Budi Santoso Updated',
          phone_number: '08123456789',
          emergency_contact: '08999888777',
          address: 'Jl. Baru No. 10, Jakarta',
          type: 'REGULAR',
          status: 'ACTIVE',
          vehicle_id: '3',
          updated_by: '1',
          updated_at: '2024-01-17T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Driver tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Nomor telepon sudah terdaftar' })
  update(
    @Param('id') id: number,
    @Body() dto: UpdateDriverDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.driverService.update(id, dto, user);
  }

  // ──────────────────────────────────────────
  // SOFT DELETE
  // ──────────────────────────────────────────
  @Delete(':id')
  @Permission('driver', 'delete')
  @ApiOperation({
    summary: 'Hapus driver by ID (soft delete)',
    description:
      'Menghapus driver secara soft delete berdasarkan id. Data tidak benar-benar dihapus dari database, hanya mengisi `deleted_at` dan `deleted_by`.',
  })
  @ApiParam({ name: 'id', description: 'ID driver (integer)', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Driver berhasil dihapus',
    schema: {
      example: {
        success: true,
        message: 'Driver "Budi Santoso" berhasil dihapus',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Driver tidak ditemukan atau sudah dihapus' })
  remove(@Param('id') id: number, @CurrentUser() user: CurrentUserType) {
    return this.driverService.remove(id, user);
  }
}