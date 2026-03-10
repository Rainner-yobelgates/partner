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
import { CreateContractDto, UpdateContractDto, QueryContractDto } from './dto/contract.dto';
import { ContractService } from './contract.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { Permission } from 'src/decorator/permission.decorator';
import { PermissionGuard } from 'src/guard/permission.guard';
import { CurrentUser, CurrentUserType } from 'src/decorator/current-user.decorator';
import { Status } from 'generated/prisma/enums';

@ApiTags('Contracts')
@Controller('contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  // ──────────────────────────────────────────
  // GET ALL
  // ──────────────────────────────────────────
  @Get()
  @Permission('contract', 'read')
  @ApiOperation({
    summary: 'Ambil semua kontrak',
    description:
      'Menampilkan daftar kontrak dengan pagination, search, filter status / active_on, dan sorting.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Halaman saat ini' })
  @ApiQuery({ name: 'perPage', required: false, example: '10', description: 'Jumlah data per halaman' })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'KTR-2024',
    description: 'Cari berdasarkan contract_number / contact_person / email / phone_number',
  })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at', description: 'Field untuk sorting' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc', description: 'Arah sorting' })
  @ApiQuery({ name: 'status', required: false, enum: Status, description: 'Filter berdasarkan status kontrak' })
  @ApiQuery({
    name: 'active_on',
    required: false,
    example: '2024-06-01T00:00:00.000Z',
    description: 'Filter kontrak yang aktif pada tanggal tertentu (start_date ≤ tanggal ≤ end_date)',
  })
  @ApiResponse({
    status: 200,
    description: 'Data kontrak berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data kontrak berhasil diambil',
        data: [
          {
            id: '1',
            contracts_uuid: '550e8400-e29b-41d4-a716-446655440000',
            contract_number: 'KTR-2024-001',
            contact_person: 'Budi Santoso',
            phone_number: '08123456789',
            email: 'budi@perusahaan.com',
            address: 'Jl. Sudirman No. 10, Jakarta',
            start_date: '2024-01-01T00:00:00.000Z',
            end_date: '2024-12-31T23:59:59.999Z',
            status: 'ACTIVE',
            created_at: '2024-01-01T08:00:00.000Z',
            updated_at: '2024-01-01T08:00:00.000Z',
          },
        ],
        total: 5,
        page: 1,
        perPage: 10,
        totalPages: 1,
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query() query: QueryContractDto) {
    return this.contractService.findAll(query);
  }

  // ──────────────────────────────────────────
  // GET ONE BY UUID
  // ──────────────────────────────────────────
  @Get(':uuid')
  @Permission('contract', 'detail')
  @ApiOperation({
    summary: 'Ambil detail kontrak by UUID',
    description: 'Menampilkan detail satu kontrak berdasarkan contracts_uuid.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID kontrak (contracts_uuid)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail kontrak berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Data kontrak berhasil diambil',
        data: {
          id: '1',
          contracts_uuid: '550e8400-e29b-41d4-a716-446655440000',
          contract_number: 'KTR-2024-001',
          contact_person: 'Budi Santoso',
          phone_number: '08123456789',
          email: 'budi@perusahaan.com',
          address: 'Jl. Sudirman No. 10, Jakarta',
          start_date: '2024-01-01T00:00:00.000Z',
          end_date: '2024-12-31T23:59:59.999Z',
          status: 'ACTIVE',
          created_by: '1',
          updated_by: null,
          created_at: '2024-01-01T08:00:00.000Z',
          updated_at: '2024-01-01T08:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Kontrak tidak ditemukan',
    schema: {
      example: {
        success: false,
        message: 'Kontrak dengan UUID 550e8400-e29b-41d4-a716-446655440000 tidak ditemukan',
      },
    },
  })
  findOne(@Param('uuid') uuid: string) {
    return this.contractService.findOne(uuid);
  }

  // ──────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────
  @Post()
  @Permission('contract', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Buat kontrak baru',
    description:
      'Membuat kontrak baru. `contract_number` harus unik jika diberikan.',
  })
  @ApiBody({ type: CreateContractDto })
  @ApiResponse({
    status: 201,
    description: 'Kontrak berhasil dibuat',
    schema: {
      example: {
        success: true,
        message: 'Kontrak berhasil dibuat',
        data: {
          id: '2',
          contracts_uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          contract_number: 'KTR-2024-002',
          contact_person: 'Siti Rahayu',
          phone_number: '08987654321',
          email: 'siti@klien.com',
          address: 'Jl. Gatot Subroto No. 5, Jakarta',
          start_date: '2024-03-01T00:00:00.000Z',
          end_date: '2025-02-28T23:59:59.999Z',
          status: 'ACTIVE',
          created_at: '2024-03-01T09:00:00.000Z',
          updated_at: '2024-03-01T09:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Nomor kontrak sudah terdaftar',
    schema: {
      example: {
        success: false,
        message: 'Kontrak dengan nomor "KTR-2024-002" sudah terdaftar',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi input gagal',
    schema: {
      example: {
        statusCode: 400,
        message: ['email must be an email'],
        error: 'Bad Request',
      },
    },
  })
  create(@Body() dto: CreateContractDto, @CurrentUser() user: CurrentUserType) {
    return this.contractService.create(dto, user);
  }

  // ──────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────
  @Put(':id')
  @Permission('contract', 'update')
  @ApiOperation({
    summary: 'Update kontrak by ID',
    description: 'Memperbarui data kontrak berdasarkan id. Semua field bersifat opsional.',
  })
  @ApiParam({ name: 'id', description: 'ID kontrak (integer)', example: 1 })
  @ApiBody({ type: UpdateContractDto })
  @ApiResponse({
    status: 200,
    description: 'Kontrak berhasil diperbarui',
    schema: {
      example: {
        success: true,
        message: 'Kontrak berhasil diperbarui',
        data: {
          id: '1',
          contracts_uuid: '550e8400-e29b-41d4-a716-446655440000',
          contract_number: 'KTR-2024-001-REV',
          contact_person: 'Budi Santoso',
          phone_number: '08123456789',
          email: 'budi.updated@perusahaan.com',
          address: 'Jl. Sudirman No. 10, Jakarta',
          start_date: '2024-01-01T00:00:00.000Z',
          end_date: '2025-12-31T23:59:59.999Z',
          status: 'ACTIVE',
          updated_by: '1',
          updated_at: '2024-06-01T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Kontrak tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Nomor kontrak sudah terdaftar' })
  update(
    @Param('id') id: number,
    @Body() dto: UpdateContractDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.contractService.update(id, dto, user);
  }

  // ──────────────────────────────────────────
  // SOFT DELETE
  // ──────────────────────────────────────────
  @Delete(':id')
  @Permission('contract', 'delete')
  @ApiOperation({
    summary: 'Hapus kontrak by ID (soft delete)',
    description:
      'Menghapus kontrak secara soft delete. Data tidak benar-benar dihapus dari database, hanya mengisi `deleted_at` dan `deleted_by`.',
  })
  @ApiParam({ name: 'id', description: 'ID kontrak (integer)', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Kontrak berhasil dihapus',
    schema: {
      example: {
        success: true,
        message: 'Kontrak "KTR-2024-001" berhasil dihapus',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Kontrak tidak ditemukan atau sudah dihapus' })
  remove(@Param('id') id: number, @CurrentUser() user: CurrentUserType) {
    return this.contractService.remove(id, user);
  }
}