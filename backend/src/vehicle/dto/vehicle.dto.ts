import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumberString } from 'class-validator';
import { Status, VehicleType } from 'generated/prisma/enums';

// ──────────────────────────────────────────
// CREATE DTO
// ──────────────────────────────────────────
export class CreateVehicleDto {
  @ApiPropertyOptional({ description: 'Nomor plat kendaraan', example: 'B 1234 ABC' })
  @IsOptional()
  @IsString()
  plate_number?: string;

  @ApiPropertyOptional({ description: 'Nomor rangka kendaraan', example: 'MH1JF5118NK123456' })
  @IsOptional()
  @IsString()
  hull_number?: string;

  @ApiPropertyOptional({
    description: 'Tipe kendaraan',
    enum: VehicleType,
    example: VehicleType.HIACE,
  })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicle_type?: VehicleType;

  @ApiPropertyOptional({ description: 'Merek kendaraan', example: 'Toyota' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Model kendaraan', example: 'Hi-Ace Commuter' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description: 'Status kendaraan',
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
export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}

// ──────────────────────────────────────────
// QUERY DTO
// ──────────────────────────────────────────
export class QueryVehicleDto {
  @ApiPropertyOptional({ description: 'Halaman saat ini', example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', example: '10' })
  @IsOptional()
  @IsNumberString()
  perPage?: string;

  @ApiPropertyOptional({
    description: 'Cari berdasarkan plate_number / hull_number / brand / model',
    example: 'Toyota',
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
    description: 'Filter berdasarkan tipe kendaraan',
    enum: VehicleType,
  })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicle_type?: VehicleType;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan status kendaraan',
    enum: Status,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}