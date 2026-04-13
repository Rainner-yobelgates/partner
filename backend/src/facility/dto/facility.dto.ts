import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumberString,
  IsNotEmpty,
} from 'class-validator';
import { Status } from 'generated/prisma/enums';
import { IsMoneyAmountRequired } from 'src/utils/money-field.decorator';

// ──────────────────────────────────────────
// CREATE DTO
// ──────────────────────────────────────────
export class CreateFacilityDto {
  @ApiProperty({ description: 'Nama fasilitas (harus unik)', example: 'WiFi' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsMoneyAmountRequired('Biaya fasilitas', '50000.00')
  cost!: string;

  @ApiPropertyOptional({
    description: 'Deskripsi fasilitas',
    example: 'Koneksi internet nirkabel di dalam armada',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Status fasilitas',
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
export class UpdateFacilityDto extends PartialType(CreateFacilityDto) {}

// ──────────────────────────────────────────
// QUERY DTO
// ──────────────────────────────────────────
export class QueryFacilityDto {
  @ApiPropertyOptional({ description: 'Halaman saat ini', example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', example: '10' })
  @IsOptional()
  @IsNumberString()
  perPage?: string;

  @ApiPropertyOptional({
    description: 'Cari berdasarkan name / description',
    example: 'WiFi',
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
    description: 'Filter berdasarkan status fasilitas',
    enum: Status,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
