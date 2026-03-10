import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumberString,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Status } from 'generated/prisma/enums';

// ──────────────────────────────────────────
// CREATE DTO
// ──────────────────────────────────────────
export class CreateRouteDto {
  @ApiPropertyOptional({ description: 'Kota / titik asal rute', example: 'Jakarta' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ description: 'Kota / titik tujuan rute', example: 'Bandung' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({
    description: 'Jarak tempuh dalam kilometer',
    example: 150.5,
  })
  @IsOptional()
  @Type(() => Number)
  distance?: number;

  @ApiPropertyOptional({
    description: 'Estimasi waktu tempuh dalam menit',
    example: 180,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  estimated_time?: number;

  @ApiPropertyOptional({
    description: 'Status rute',
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
export class UpdateRouteDto extends PartialType(CreateRouteDto) {}

// ──────────────────────────────────────────
// QUERY DTO
// ──────────────────────────────────────────
export class QueryRouteDto {
  @ApiPropertyOptional({ description: 'Halaman saat ini', example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', example: '10' })
  @IsOptional()
  @IsNumberString()
  perPage?: string;

  @ApiPropertyOptional({
    description: 'Cari berdasarkan origin / destination',
    example: 'Jakarta',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Field untuk sorting', example: 'created_at' })
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
    description: 'Filter berdasarkan status rute',
    enum: Status,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}