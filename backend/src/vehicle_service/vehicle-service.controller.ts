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
import {
  CreateVehicleServiceDto,
  UpdateVehicleServiceDto,
  QueryVehicleServiceDto,
} from './dto/vehicle-service.dto';
import { VehicleServiceService } from './vehicle-service.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { Permission } from 'src/decorator/permission.decorator';
import { PermissionGuard } from 'src/guard/permission.guard';
import { CurrentUser, CurrentUserType } from 'src/decorator/current-user.decorator';
import { ServiceType, Status } from 'generated/prisma/enums';

@ApiTags('Vehicle Services')
@Controller('vehicle-services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class VehicleServiceController {
  constructor(private readonly vehicleServiceService: VehicleServiceService) {}

  // ──────────────────────────────────────────
  // GET ALL
  // ──────────────────────────────────────────
  @Get()
  @Permission('vehicle-service', 'read')
  @ApiOperation({
    summary: 'Ambil semua data servis kendaraan',
    description:
      'Menampilkan daftar servis kendaraan dengan pagination, search, filter (vehicle_id, service_type, status, rentang tanggal), dan sorting.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Halaman saat ini' })
  @ApiQuery({ name: 'perPage', required: false, example: '10', description: 'Jumlah data per halaman' })
  @ApiQuery({ name: 'search', required: false, example: 'ganti oli', description: 'Cari berdasarkan description' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'service_date', description: 'Field untuk sorting' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc', description: 'Arah sorting' })
  @ApiQuery({ name: 'vehicle_id', required: false, example: '1', description: 'Filter berdasarkan ID kendaraan' })
  @ApiQuery({ name: 'service_type', required: false, enum: ServiceType, description: 'Filter berdasarkan tipe servis' })
  @ApiQuery({ name: 'status', required: false, enum: Status, description: 'Filter berdasarkan status' })
  @ApiQuery({ name: 'date_from', required: false, example: '2024-01-01T00:00:00.000Z', description: 'Filter dari tanggal servis' })
  @ApiQuery({ name: 'date_to', required: false, example: '2024-12-31T23:59:59.999Z', description: 'Filter sampai tanggal servis' })
  @ApiResponse({
    status: 200,
    description: 'Data servis kendaraan berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data servis kendaraan berhasil diambil',
        data: [
          {
            id: '1',
            vehicle_services_uuid: '550e8400-e29b-41d4-a716-446655440000',
            vehicle_id: '2',
            vehicle: { id: '2', plate_number: 'B 1234 ABC', vehicle_type: 'HIACE' },
            service_date: '2024-03-01T08:00:00.000Z',
            service_type: 'OIL_CHANGE',
            cost: 350000,
            description: 'Ganti oli mesin + filter udara',
            status: 'ACTIVE',
            created_at: '2024-03-01T08:00:00.000Z',
            updated_at: '2024-03-01T08:00:00.000Z',
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
  findAll(@Query() query: QueryVehicleServiceDto) {
    return this.vehicleServiceService.findAll(query);
  }

  // ──────────────────────────────────────────
  // GET ONE BY UUID
  // ──────────────────────────────────────────
  @Get(':uuid')
  @Permission('vehicle-service', 'detail')
  @ApiOperation({
    summary: 'Ambil detail servis kendaraan by UUID',
    description: 'Menampilkan detail satu catatan servis beserta info lengkap kendaraan.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID catatan servis (vehicle_services_uuid)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail servis kendaraan berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data servis kendaraan berhasil diambil',
        data: {
          id: '1',
          vehicle_services_uuid: '550e8400-e29b-41d4-a716-446655440000',
          vehicle_id: '2',
          vehicle: {
            id: '2',
            plate_number: 'B 1234 ABC',
            vehicle_type: 'HIACE',
            brand: 'Toyota',
            model: 'Hi-Ace Commuter',
          },
          service_date: '2024-03-01T08:00:00.000Z',
          service_type: 'OIL_CHANGE',
          cost: 350000,
          description: 'Ganti oli mesin + filter udara',
          status: 'ACTIVE',
          created_by: '1',
          updated_by: null,
          created_at: '2024-03-01T08:00:00.000Z',
          updated_at: '2024-03-01T08:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Data servis tidak ditemukan',
    schema: {
      example: {
        success: false,
        message: 'Data servis dengan UUID 550e8400-e29b-41d4-a716-446655440000 tidak ditemukan',
      },
    },
  })
  findOne(@Param('uuid') uuid: string) {
    return this.vehicleServiceService.findOne(uuid);
  }

  // ──────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────
  @Post()
  @Permission('vehicle-service', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Buat catatan servis baru',
    description:
      'Membuat catatan servis kendaraan baru. `vehicle_id` akan divalidasi keberadaannya jika diberikan.',
  })
  @ApiBody({ type: CreateVehicleServiceDto })
  @ApiResponse({
    status: 201,
    description: 'Data servis kendaraan berhasil dibuat',
    schema: {
      example: {
        success: true,
        message: 'Data servis kendaraan berhasil dibuat',
        data: {
          id: '3',
          vehicle_services_uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          vehicle_id: '1',
          service_date: '2024-04-10T09:00:00.000Z',
          service_type: 'MAINTENANCE',
          cost: 500000,
          description: 'Service berkala 10.000 km',
          status: 'ACTIVE',
          created_at: '2024-04-10T09:00:00.000Z',
          updated_at: '2024-04-10T09:00:00.000Z',
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
        message: 'Kendaraan dengan ID 99 tidak ditemukan',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi input gagal',
    schema: {
      example: {
        statusCode: 400,
        message: ['service_type must be a valid enum value'],
        error: 'Bad Request',
      },
    },
  })
  create(@Body() dto: CreateVehicleServiceDto, @CurrentUser() user: CurrentUserType) {
    return this.vehicleServiceService.create(dto, user);
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
  @Put(':id')
  @Permission('vehicle-service', 'update')
  @ApiOperation({
    summary: 'Update catatan servis by ID',
    description: 'Memperbarui catatan servis kendaraan berdasarkan id. Semua field bersifat opsional.',
  })
  @ApiParam({ name: 'id', description: 'ID catatan servis (integer)', example: 1 })
  @ApiBody({ type: UpdateVehicleServiceDto })
  @ApiResponse({
    status: 200,
    description: 'Data servis kendaraan berhasil diperbarui',
    schema: {
      example: {
        success: true,
        message: 'Data servis kendaraan berhasil diperbarui',
        data: {
          id: '1',
          vehicle_services_uuid: '550e8400-e29b-41d4-a716-446655440000',
          vehicle_id: '2',
          service_date: '2024-03-05T08:00:00.000Z',
          service_type: 'REPAIR',
          cost: 1200000,
          description: 'Perbaikan rem belakang',
          status: 'ACTIVE',
          updated_by: '1',
          updated_at: '2024-03-05T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Data servis atau kendaraan tidak ditemukan' })
  update(
    @Param('id') id: number,
    @Body() dto: UpdateVehicleServiceDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.vehicleServiceService.update(id, dto, user);
  }

  // ──────────────────────────────────────────
  // SOFT DELETE
  // ──────────────────────────────────────────
  @Delete(':id')
  @Permission('vehicle-service', 'delete')
  @ApiOperation({
    summary: 'Hapus catatan servis by ID (soft delete)',
    description:
      'Menghapus catatan servis secara soft delete. Data tidak benar-benar dihapus dari database, hanya mengisi `deleted_at` dan `deleted_by`.',
  })
  @ApiParam({ name: 'id', description: 'ID catatan servis (integer)', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Data servis berhasil dihapus',
    schema: {
      example: {
        success: true,
        message: 'Data servis "OIL_CHANGE" berhasil dihapus',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Data servis tidak ditemukan atau sudah dihapus' })
  remove(@Param('id') id: number, @CurrentUser() user: CurrentUserType) {
    return this.vehicleServiceService.remove(id, user);
  }
}