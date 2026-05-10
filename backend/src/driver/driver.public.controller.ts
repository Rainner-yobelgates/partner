import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DriverService } from './driver.service';
import { QueryDriverDto } from './dto/driver.dto';
import { DriverType, Status } from 'generated/prisma/enums';

@ApiTags('Drivers (Public)')
@Controller('drivers/public')
export class DriverPublicController {
  constructor(private readonly driverService: DriverService) {}

  @Get()
  @ApiOperation({
    summary: 'Ambil semua driver (Public)',
    description: 'Endpoint publik untuk mengambil daftar driver aktif tanpa memerlukan autentikasi. Digunakan untuk form surat jalan driver.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Halaman saat ini' })
  @ApiQuery({ name: 'perPage', required: false, example: '200', description: 'Jumlah data per halaman' })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'Budi',
    description: 'Cari berdasarkan name / phone_number / address',
  })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at', description: 'Field untuk sorting' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc', description: 'Arah sorting' })
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
            type: 'MAIN',
            status: 'ACTIVE',
            vehicle_id: '2',
            vehicle: { id: '2', plate_number: 'B 1234 ABC' },
            created_at: '2024-01-15T08:00:00.000Z',
            updated_at: '2024-01-15T08:00:00.000Z',
          },
        ],
        total: 25,
        page: 1,
        perPage: 200,
        totalPages: 1,
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAllPublic(@Query() query: QueryDriverDto) {
    return this.driverService.findAll(query);
  }
}
