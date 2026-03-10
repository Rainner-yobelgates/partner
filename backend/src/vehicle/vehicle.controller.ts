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
import { CreateVehicleDto, UpdateVehicleDto, QueryVehicleDto } from './dto/vehicle.dto';
import { VehicleService } from './vehicle.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { Permission } from 'src/decorator/permission.decorator';
import { PermissionGuard } from 'src/guard/permission.guard';
import { CurrentUser, CurrentUserType } from 'src/decorator/current-user.decorator';
import { Status, VehicleType } from 'generated/prisma/enums';

@ApiTags('Vehicles')
@Controller('vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  // ──────────────────────────────────────────
  // GET ALL
  // ──────────────────────────────────────────
  @Get()
  @Permission('vehicle', 'read')
  @ApiOperation({
    summary: 'Ambil semua kendaraan',
    description:
      'Menampilkan daftar kendaraan dengan pagination, search, filter, dan sorting untuk kebutuhan datatable.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Halaman saat ini' })
  @ApiQuery({ name: 'perPage', required: false, example: '10', description: 'Jumlah data per halaman' })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'Toyota',
    description: 'Cari berdasarkan plate_number / hull_number / brand / model',
  })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at', description: 'Field untuk sorting' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc', description: 'Arah sorting' })
  @ApiQuery({ name: 'vehicle_type', required: false, enum: VehicleType, description: 'Filter berdasarkan tipe kendaraan' })
  @ApiQuery({ name: 'status', required: false, enum: Status, description: 'Filter berdasarkan status kendaraan' })
  @ApiResponse({
    status: 200,
    description: 'Data kendaraan berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data kendaraan berhasil diambil',
        data: [
          {
            id: '1',
            vehicles_uuid: '550e8400-e29b-41d4-a716-446655440000',
            plate_number: 'B 1234 ABC',
            hull_number: 'MH1JF5118NK123456',
            vehicle_type: 'HIACE',
            brand: 'Toyota',
            model: 'Hi-Ace Commuter',
            status: 'ACTIVE',
            created_at: '2024-01-15T08:00:00.000Z',
            updated_at: '2024-01-15T08:00:00.000Z',
          },
        ],
        total: 15,
        page: 1,
        perPage: 10,
        totalPages: 2,
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query() query: QueryVehicleDto) {
    return this.vehicleService.findAll(query);
  }

  // ──────────────────────────────────────────
  // GET ONE BY UUID
  // ──────────────────────────────────────────
  @Get(':uuid')
  @Permission('vehicle', 'detail')
  @ApiOperation({
    summary: 'Ambil detail kendaraan by UUID',
    description: 'Menampilkan detail satu kendaraan beserta daftar driver yang terdaftar.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID kendaraan (vehicles_uuid)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail kendaraan berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data kendaraan berhasil diambil',
        data: {
          id: '1',
          vehicles_uuid: '550e8400-e29b-41d4-a716-446655440000',
          plate_number: 'B 1234 ABC',
          hull_number: 'MH1JF5118NK123456',
          vehicle_type: 'HIACE',
          brand: 'Toyota',
          model: 'Hi-Ace Commuter',
          status: 'ACTIVE',
          created_by: '1',
          updated_by: null,
          created_at: '2024-01-15T08:00:00.000Z',
          updated_at: '2024-01-15T08:00:00.000Z',
          drivers: [
            {
              id: '2',
              drivers_uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
              name: 'Budi Santoso',
              phone_number: '08123456789',
              type: 'REGULAR',
              status: 'ACTIVE',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Kendaraan tidak ditemukan',
    schema: {
      example: {
        success: false,
        message: 'Kendaraan dengan UUID 550e8400-e29b-41d4-a716-446655440000 tidak ditemukan',
      },
    },
  })
  findOne(@Param('uuid') uuid: string) {
    return this.vehicleService.findOne(uuid);
  }

  // ──────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────
  @Post()
  @Permission('vehicle', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Buat kendaraan baru',
    description:
      'Membuat kendaraan baru. `plate_number` dan `hull_number` harus unik jika diberikan.',
  })
  @ApiBody({ type: CreateVehicleDto })
  @ApiResponse({
    status: 201,
    description: 'Kendaraan berhasil dibuat',
    schema: {
      example: {
        success: true,
        message: 'Kendaraan berhasil dibuat',
        data: {
          id: '3',
          vehicles_uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          plate_number: 'D 5678 XYZ',
          hull_number: 'MH1JF5118NK999999',
          vehicle_type: 'EVALIA',
          brand: 'Nissan',
          model: 'Evalia',
          status: 'ACTIVE',
          created_at: '2024-01-16T09:00:00.000Z',
          updated_at: '2024-01-16T09:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Plat nomor atau nomor rangka sudah terdaftar',
    schema: {
      example: {
        success: false,
        message: 'Kendaraan dengan plat nomor "D 5678 XYZ" sudah terdaftar',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi input gagal',
    schema: {
      example: {
        statusCode: 400,
        message: ['vehicle_type must be a valid enum value'],
        error: 'Bad Request',
      },
    },
  })
  create(@Body() dto: CreateVehicleDto, @CurrentUser() user: CurrentUserType) {
    return this.vehicleService.create(dto, user);
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
  @Put(':id')
  @Permission('vehicle', 'update')
  @ApiOperation({
    summary: 'Update kendaraan by ID',
    description: 'Memperbarui data kendaraan berdasarkan id. Semua field bersifat opsional.',
  })
  @ApiParam({ name: 'id', description: 'ID kendaraan (integer)', example: 1 })
  @ApiBody({ type: UpdateVehicleDto })
  @ApiResponse({
    status: 200,
    description: 'Kendaraan berhasil diperbarui',
    schema: {
      example: {
        success: true,
        message: 'Kendaraan berhasil diperbarui',
        data: {
          id: '1',
          vehicles_uuid: '550e8400-e29b-41d4-a716-446655440000',
          plate_number: 'B 9999 ZZZ',
          hull_number: 'MH1JF5118NK123456',
          vehicle_type: 'HIACE',
          brand: 'Toyota',
          model: 'Hi-Ace Premio',
          status: 'ACTIVE',
          updated_by: '1',
          updated_at: '2024-01-17T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Kendaraan tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Plat nomor atau nomor rangka sudah terdaftar' })
  update(
    @Param('id') id: number,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.vehicleService.update(id, dto, user);
  }

  // ──────────────────────────────────────────
  // SOFT DELETE
  // ──────────────────────────────────────────
  @Delete(':id')
  @Permission('vehicle', 'delete')
  @ApiOperation({
    summary: 'Hapus kendaraan by ID (soft delete)',
    description:
      'Menghapus kendaraan secara soft delete. Data tidak benar-benar dihapus dari database, hanya mengisi `deleted_at` dan `deleted_by`.',
  })
  @ApiParam({ name: 'id', description: 'ID kendaraan (integer)', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Kendaraan berhasil dihapus',
    schema: {
      example: {
        success: true,
        message: 'Kendaraan "B 1234 ABC" berhasil dihapus',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Kendaraan tidak ditemukan atau sudah dihapus' })
  remove(@Param('id') id: number, @CurrentUser() user: CurrentUserType) {
    return this.vehicleService.remove(id, user);
  }
}