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
import { CreateShuttleDto, UpdateShuttleDto, QueryShuttleDto } from './dto/shuttle.dto';
import { ShuttleService } from './shuttle.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { Permission } from 'src/decorator/permission.decorator';
import { PermissionGuard } from 'src/guard/permission.guard';
import { CurrentUser, CurrentUserType } from 'src/decorator/current-user.decorator';
import { Status } from 'generated/prisma/enums';

@ApiTags('Shuttles')
@Controller('shuttles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ShuttleController {
  constructor(private readonly shuttleService: ShuttleService) {}

  // ──────────────────────────────────────────
  // GET ALL
  // ──────────────────────────────────────────
  @Get()
  @Permission('shuttle', 'read')
  @ApiOperation({
    summary: 'Ambil semua data shuttle',
    description:
      'Menampilkan daftar shuttle dengan pagination, filter (client_id, vehicle_id, route_id, status, rentang tanggal), dan sorting.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Halaman saat ini' })
  @ApiQuery({ name: 'perPage', required: false, example: '10', description: 'Jumlah data per halaman' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'scheduled_date', description: 'Field untuk sorting' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc', description: 'Arah sorting' })
  @ApiQuery({ name: 'client_id', required: false, example: '1', description: 'Filter berdasarkan ID klien' })
  @ApiQuery({ name: 'vehicle_id', required: false, example: '2', description: 'Filter berdasarkan ID kendaraan' })
  @ApiQuery({ name: 'route_id', required: false, example: '3', description: 'Filter berdasarkan ID rute' })
  @ApiQuery({ name: 'status', required: false, enum: Status, description: 'Filter berdasarkan status shuttle' })
  @ApiQuery({ name: 'date_from', required: false, example: '2024-06-01T00:00:00.000Z', description: 'Filter dari tanggal jadwal' })
  @ApiQuery({ name: 'date_to', required: false, example: '2024-06-30T23:59:59.999Z', description: 'Filter sampai tanggal jadwal' })
  @ApiResponse({
    status: 200,
    description: 'Data shuttle berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data shuttle berhasil diambil',
        data: [
          {
            id: '1',
            shuttles_uuid: '550e8400-e29b-41d4-a716-446655440000',
            client_id: '1',
            vehicle_id: '2',
            route_id: '3',
            client: { id: '1', clients_uuid: '...', name: 'PT Contoh', code: 'CTH' },
            vehicle: { id: '2', plate_number: 'B 1234 ABC', vehicle_type: 'HIACE' },
            route: { id: '3', origin: 'Jakarta', destination: 'Bandung' },
            crew_incentive: '150000.00',
            scheduled_date: '2024-06-15T07:00:00.000Z',
            fuel: '200000.00',
            toll_fee: '50000.00',
            others: '25000.00',
            status: 'ACTIVE',
            created_at: '2024-06-01T08:00:00.000Z',
            updated_at: '2024-06-01T08:00:00.000Z',
          },
        ],
        total: 12,
        page: 1,
        perPage: 10,
        totalPages: 2,
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query() query: QueryShuttleDto) {
    return this.shuttleService.findAll(query);
  }

  // ──────────────────────────────────────────
  // GET ONE BY UUID
  // ──────────────────────────────────────────
  @Get(':uuid')
  @Permission('shuttle', 'detail')
  @ApiOperation({
    summary: 'Ambil detail shuttle by UUID',
    description: 'Menampilkan detail satu shuttle beserta klien, kendaraan, dan rute.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID shuttle (shuttles_uuid)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail shuttle berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data shuttle berhasil diambil',
        data: {
          id: '1',
          shuttles_uuid: '550e8400-e29b-41d4-a716-446655440000',
          client_id: '1',
          vehicle_id: '2',
          route_id: '3',
          client: { id: '1', clients_uuid: '...', name: 'PT Contoh', code: 'CTH', contact_person: 'Ibu Ana', phone_number: '021-111', email: 'a@x.com' },
          vehicle: {
            id: '2',
            plate_number: 'B 1234 ABC',
            vehicle_type: 'HIACE',
            brand: 'Toyota',
            model: 'Hi-Ace Commuter',
          },
          route: {
            id: '3',
            origin: 'Jakarta',
            destination: 'Bandung',
            distance: 150.5,
            estimated_time: 180,
          },
          crew_incentive: '150000.00',
          scheduled_date: '2024-06-15T07:00:00.000Z',
          fuel: '200000.00',
          toll_fee: '50000.00',
          others: '25000.00',
          status: 'ACTIVE',
          created_by: '1',
          updated_by: null,
          created_at: '2024-06-01T08:00:00.000Z',
          updated_at: '2024-06-01T08:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Shuttle tidak ditemukan',
    schema: {
      example: {
        success: false,
        message: 'Shuttle dengan UUID 550e8400-e29b-41d4-a716-446655440000 tidak ditemukan',
      },
    },
  })
  findOne(@Param('uuid') uuid: string) {
    return this.shuttleService.findOne(uuid);
  }

  // ──────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────
  @Post()
  @Permission('shuttle', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Buat shuttle baru',
    description:
      'Membuat data shuttle baru. `client_id` wajib (hubungan dengan kontrak hanya lewat klien yang sama di master kontrak). `vehicle_id` dan `route_id` divalidasi jika diberikan.',
  })
  @ApiBody({ type: CreateShuttleDto })
  @ApiResponse({
    status: 201,
    description: 'Shuttle berhasil dibuat',
    schema: {
      example: {
        success: true,
        message: 'Shuttle berhasil dibuat',
        data: {
          id: '2',
          shuttles_uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          client_id: '1',
          vehicle_id: '2',
          route_id: '3',
          crew_incentive: '150000.00',
          scheduled_date: '2024-07-01T07:00:00.000Z',
          fuel: '200000.00',
          toll_fee: '50000.00',
          others: '0.00',
          status: 'ACTIVE',
          created_at: '2024-06-20T09:00:00.000Z',
          updated_at: '2024-06-20T09:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Klien / kendaraan / rute tidak ditemukan',
    schema: {
      example: {
        success: false,
        message: 'Kendaraan dengan ID 99 tidak ditemukan',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validasi input gagal' })
  create(@Body() dto: CreateShuttleDto, @CurrentUser() user: CurrentUserType) {
    return this.shuttleService.create(dto, user);
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
  @Put(':id')
  @Permission('shuttle', 'update')
  @ApiOperation({
    summary: 'Update shuttle by ID',
    description: 'Memperbarui data shuttle berdasarkan id. Semua field bersifat opsional.',
  })
  @ApiParam({ name: 'id', description: 'ID shuttle (integer)', example: 1 })
  @ApiBody({ type: UpdateShuttleDto })
  @ApiResponse({
    status: 200,
    description: 'Shuttle berhasil diperbarui',
    schema: {
      example: {
        success: true,
        message: 'Shuttle berhasil diperbarui',
        data: {
          id: '1',
          shuttles_uuid: '550e8400-e29b-41d4-a716-446655440000',
          client_id: '1',
          vehicle_id: '3',
          route_id: '3',
          crew_incentive: '175000.00',
          scheduled_date: '2024-06-20T07:00:00.000Z',
          fuel: '220000.00',
          toll_fee: '55000.00',
          others: '30000.00',
          status: 'ACTIVE',
          updated_by: '1',
          updated_at: '2024-06-10T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Shuttle / klien / kendaraan / rute tidak ditemukan' })
  update(
    @Param('id') id: number,
    @Body() dto: UpdateShuttleDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.shuttleService.update(id, dto, user);
  }

  // ──────────────────────────────────────────
  // SOFT DELETE
  // ──────────────────────────────────────────
  @Delete(':id')
  @Permission('shuttle', 'delete')
  @ApiOperation({
    summary: 'Hapus shuttle by ID (soft delete)',
    description:
      'Menghapus shuttle secara soft delete. Data tidak benar-benar dihapus dari database, hanya mengisi `deleted_at` dan `deleted_by`.',
  })
  @ApiParam({ name: 'id', description: 'ID shuttle (integer)', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Shuttle berhasil dihapus',
    schema: {
      example: {
        success: true,
        message: 'Shuttle "550e8400-e29b-41d4-a716-446655440000" berhasil dihapus',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Shuttle tidak ditemukan atau sudah dihapus' })
  remove(@Param('id') id: number, @CurrentUser() user: CurrentUserType) {
    return this.shuttleService.remove(id, user);
  }
}