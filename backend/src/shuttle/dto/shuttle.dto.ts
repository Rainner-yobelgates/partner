import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsNumberString,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Status } from 'generated/prisma/enums';

// ──────────────────────────────────────────
// CREATE DTO
// ──────────────────────────────────────────
export class CreateShuttleDto {
  @ApiPropertyOptional({ description: 'ID kontrak yang terkait', example: '1' })
  @IsOptional()
  @IsNumberString()
  contract_id?: string;

  @ApiPropertyOptional({ description: 'ID kendaraan yang digunakan', example: '2' })
  @IsOptional()
  @IsNumberString()
  vehicle_id?: string;

  @ApiPropertyOptional({ description: 'ID rute yang digunakan', example: '3' })
  @IsOptional()
  @IsNumberString()
  route_id?: string;

  @ApiPropertyOptional({
    description: 'Insentif kru dalam rupiah',
    example: 150000.0,
  })
  @IsOptional()
  @Type(() => Number)
  crew_incentive?: number;

  @ApiPropertyOptional({
    description: 'Tanggal jadwal shuttle (ISO 8601)',
    example: '2024-06-15T07:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduled_date?: string;

  @ApiPropertyOptional({ description: 'Biaya bahan bakar dalam rupiah', example: 200000.0 })
  @IsOptional()
  @Type(() => Number)
  fuel?: number;

  @ApiPropertyOptional({ description: 'Biaya tol dalam rupiah', example: 50000.0 })
  @IsOptional()
  @Type(() => Number)
  toll_fee?: number;

  @ApiPropertyOptional({ description: 'Biaya lainnya dalam rupiah', example: 25000.0 })
  @IsOptional()
  @Type(() => Number)
  others?: number;

  @ApiPropertyOptional({
    description: 'Status shuttle',
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
export class UpdateShuttleDto extends PartialType(CreateShuttleDto) {}

// ──────────────────────────────────────────
// QUERY DTO
// ──────────────────────────────────────────
export class QueryShuttleDto {
  @ApiPropertyOptional({ description: 'Halaman saat ini', example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', example: '10' })
  @IsOptional()
  @IsNumberString()
  perPage?: string;

  @ApiPropertyOptional({ description: 'Field untuk sorting', example: 'scheduled_date' })
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Arah sorting',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID kontrak', example: '1' })
  @IsOptional()
  @IsNumberString()
  contract_id?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID kendaraan', example: '2' })
  @IsOptional()
  @IsNumberString()
  vehicle_id?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID rute', example: '3' })
  @IsOptional()
  @IsNumberString()
  route_id?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan status shuttle',
    enum: Status,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({
    description: 'Filter dari tanggal jadwal (ISO 8601)',
    example: '2024-06-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    description: 'Filter sampai tanggal jadwal (ISO 8601)',
    example: '2024-06-30T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}