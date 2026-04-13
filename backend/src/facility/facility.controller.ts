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
import { CreateFacilityDto, UpdateFacilityDto, QueryFacilityDto } from './dto/facility.dto';
import { FacilityService } from './facility.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { Permission } from 'src/decorator/permission.decorator';
import { PermissionGuard } from 'src/guard/permission.guard';
import { CurrentUser, CurrentUserType } from 'src/decorator/current-user.decorator';
import { Status } from 'generated/prisma/enums';

@ApiTags('Facilities')
@Controller('facilities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FacilityController {
  constructor(private readonly facilityService: FacilityService) {}

  // ──────────────────────────────────────────
  // GET ALL
  // ──────────────────────────────────────────
  @Get()
  @Permission('facility', 'read')
  @ApiOperation({
    summary: 'Ambil semua fasilitas',
    description:
      'Menampilkan daftar fasilitas dengan pagination, search, filter status, dan sorting untuk kebutuhan datatable.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Halaman saat ini' })
  @ApiQuery({ name: 'perPage', required: false, example: '10', description: 'Jumlah data per halaman' })
  @ApiQuery({ name: 'search', required: false, example: 'WiFi', description: 'Cari berdasarkan name / description' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at', description: 'Field untuk sorting' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc', description: 'Arah sorting' })
  @ApiQuery({ name: 'status', required: false, enum: Status, description: 'Filter berdasarkan status fasilitas' })
  @ApiResponse({
    status: 200,
    description: 'Data fasilitas berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data fasilitas berhasil diambil',
        data: [
          {
            id: '1',
            facilities_uuid: '550e8400-e29b-41d4-a716-446655440000',
            name: 'WiFi',
            cost: '50000.00',
            description: 'Koneksi internet nirkabel di dalam armada',
            status: 'ACTIVE',
            created_at: '2024-01-15T08:00:00.000Z',
            updated_at: '2024-01-15T08:00:00.000Z',
          },
        ],
        total: 8,
        page: 1,
        perPage: 10,
        totalPages: 1,
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query() query: QueryFacilityDto) {
    return this.facilityService.findAll(query);
  }

  // ──────────────────────────────────────────
  // GET ONE BY UUID
  // ──────────────────────────────────────────
  @Get(':uuid')
  @Permission('facility', 'detail')
  @ApiOperation({
    summary: 'Ambil detail fasilitas by UUID',
    description: 'Menampilkan detail satu fasilitas berdasarkan facilities_uuid.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID fasilitas (facilities_uuid)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail fasilitas berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data fasilitas berhasil diambil',
        data: {
          id: '1',
          facilities_uuid: '550e8400-e29b-41d4-a716-446655440000',
          name: 'WiFi',
          cost: '50000.00',
          description: 'Koneksi internet nirkabel di dalam armada',
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
    description: 'Fasilitas tidak ditemukan',
    schema: {
      example: {
        success: false,
        message: 'Fasilitas dengan UUID 550e8400-e29b-41d4-a716-446655440000 tidak ditemukan',
      },
    },
  })
  findOne(@Param('uuid') uuid: string) {
    return this.facilityService.findOne(uuid);
  }

  // ──────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────
  @Post()
  @Permission('facility', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Buat fasilitas baru',
    description: 'Membuat fasilitas baru. Field `name` wajib diisi dan harus unik.',
  })
  @ApiBody({ type: CreateFacilityDto })
  @ApiResponse({
    status: 201,
    description: 'Fasilitas berhasil dibuat',
    schema: {
      example: {
        success: true,
        message: 'Fasilitas berhasil dibuat',
        data: {
          id: '2',
          facilities_uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          name: 'AC',
          cost: '0.00',
          description: 'Pendingin udara di seluruh kabin',
          status: 'ACTIVE',
          created_at: '2024-01-16T09:00:00.000Z',
          updated_at: '2024-01-16T09:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Nama fasilitas sudah terdaftar',
    schema: {
      example: {
        success: false,
        message: 'Fasilitas dengan nama "AC" sudah terdaftar',
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
  create(@Body() dto: CreateFacilityDto, @CurrentUser() user: CurrentUserType) {
    return this.facilityService.create(dto, user);
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
  @Put(':id')
  @Permission('facility', 'update')
  @ApiOperation({
    summary: 'Update fasilitas by ID',
    description: 'Memperbarui data fasilitas berdasarkan id. Semua field bersifat opsional.',
  })
  @ApiParam({ name: 'id', description: 'ID fasilitas (integer)', example: 1 })
  @ApiBody({ type: UpdateFacilityDto })
  @ApiResponse({
    status: 200,
    description: 'Fasilitas berhasil diperbarui',
    schema: {
      example: {
        success: true,
        message: 'Fasilitas berhasil diperbarui',
        data: {
          id: '1',
          facilities_uuid: '550e8400-e29b-41d4-a716-446655440000',
          name: 'WiFi Premium',
          cost: '75000.00',
          description: 'Koneksi internet nirkabel high-speed',
          status: 'ACTIVE',
          updated_by: '1',
          updated_at: '2024-01-17T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Fasilitas tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Nama fasilitas sudah terdaftar' })
  update(
    @Param('id') id: number,
    @Body() dto: UpdateFacilityDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.facilityService.update(id, dto, user);
  }

  // ──────────────────────────────────────────
  // SOFT DELETE
  // ──────────────────────────────────────────
  @Delete(':id')
  @Permission('facility', 'delete')
  @ApiOperation({
    summary: 'Hapus fasilitas by ID (soft delete)',
    description:
      'Menghapus fasilitas secara soft delete. Data tidak benar-benar dihapus dari database, hanya mengisi `deleted_at` dan `deleted_by`.',
  })
  @ApiParam({ name: 'id', description: 'ID fasilitas (integer)', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Fasilitas berhasil dihapus',
    schema: {
      example: {
        success: true,
        message: 'Fasilitas "WiFi" berhasil dihapus',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Fasilitas tidak ditemukan atau sudah dihapus' })
  remove(@Param('id') id: number, @CurrentUser() user: CurrentUserType) {
    return this.facilityService.remove(id, user);
  }
}