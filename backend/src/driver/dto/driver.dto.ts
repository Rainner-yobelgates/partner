import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumberString,
} from 'class-validator';
import { DriverType, Status } from 'generated/prisma/enums';

// ──────────────────────────────────────────
// CREATE DTO
// ──────────────────────────────────────────
export class CreateDriverDto {
  @ApiPropertyOptional({
    description: 'ID kendaraan yang dikendarai driver',
    example: '1',
  })
  @IsOptional()
  @IsNumberString()
  vehicle_id?: string;

  @ApiProperty({ description: 'Nama driver', example: 'Budi Santoso' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Nomor telepon driver', example: '08123456789' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ description: 'Kontak darurat driver', example: '08987654321' })
  @IsOptional()
  @IsString()
  emergency_contact?: string;

  @ApiPropertyOptional({ description: 'Alamat driver', example: 'Jl. Merdeka No. 1, Jakarta' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Tipe driver',
    enum: DriverType,
    example: DriverType.MAIN,
  })
  @IsOptional()
  @IsEnum(DriverType)
  type?: DriverType;

  @ApiPropertyOptional({
    description: 'Status driver',
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
export class UpdateDriverDto extends PartialType(CreateDriverDto) {}

// ──────────────────────────────────────────
// QUERY DTO
// ──────────────────────────────────────────
export class QueryDriverDto {
  @ApiPropertyOptional({ description: 'Halaman saat ini', example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', example: '10' })
  @IsOptional()
  @IsNumberString()
  perPage?: string;

  @ApiPropertyOptional({
    description: 'Cari berdasarkan name / phone_number / address',
    example: 'Budi',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Field untuk sorting',
    example: 'created_at',
  })
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
    description: 'Filter berdasarkan tipe driver',
    enum: DriverType,
  })
  @IsOptional()
  @IsEnum(DriverType)
  type?: DriverType;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan status driver',
    enum: Status,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}