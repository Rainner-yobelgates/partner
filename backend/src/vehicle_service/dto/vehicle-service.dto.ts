import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumberString,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType, Status } from 'generated/prisma/enums';

// ──────────────────────────────────────────
// CREATE DTO
// ──────────────────────────────────────────
export class CreateVehicleServiceDto {
  @ApiPropertyOptional({ description: 'ID kendaraan yang diservis', example: '1' })
  @IsOptional()
  @IsNumberString()
  vehicle_id?: string;

  @ApiPropertyOptional({
    description: 'Tanggal servis dilakukan (ISO 8601)',
    example: '2024-03-01T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  service_date?: string;

  @ApiPropertyOptional({
    description: 'Tipe servis',
    enum: ServiceType,
    example: ServiceType.OIL_CHANGE,
  })
  @IsOptional()
  @IsEnum(ServiceType)
  service_type?: ServiceType;

  @ApiPropertyOptional({
    description: 'Biaya servis dalam rupiah',
    example: 350000.0,
  })
  @IsOptional()
  @Type(() => Number)
  cost?: number;

  @ApiPropertyOptional({
    description: 'Keterangan atau deskripsi servis',
    example: 'Ganti oli mesin + filter udara',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Status catatan servis',
    enum: Status,
    example: Status.ACTIVE,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

// ──────────────────────────────────────────
// UPDATE DTO
// ──────────────────────────────────────────
export class UpdateVehicleServiceDto extends PartialType(CreateVehicleServiceDto) {}

// ──────────────────────────────────────────
// QUERY DTO
// ──────────────────────────────────────────
export class QueryVehicleServiceDto {
  @ApiPropertyOptional({ description: 'Halaman saat ini', example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', example: '10' })
  @IsOptional()
  @IsNumberString()
  perPage?: string;

  @ApiPropertyOptional({
    description: 'Cari berdasarkan description',
    example: 'ganti oli',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Field untuk sorting', example: 'service_date' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Arah sorting',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Filter berdasarkan ID kendaraan',
    example: '1',
  })
  @IsOptional()
  @IsNumberString()
  vehicle_id?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan tipe servis',
    enum: ServiceType,
  })
  @IsOptional()
  @IsEnum(ServiceType)
  service_type?: ServiceType;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan status',
    enum: Status,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({
    description: 'Filter dari tanggal servis (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    description: 'Filter sampai tanggal servis (ISO 8601)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}