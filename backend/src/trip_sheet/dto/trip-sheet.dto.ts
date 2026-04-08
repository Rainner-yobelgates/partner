import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumberString,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Status } from 'generated/prisma/enums';

export class CreateTripSheetDto {
  @ApiProperty({ description: 'ID order vehicle', example: '1' })
  @IsString()
  order_vehicle_id!: string;

  @ApiPropertyOptional({ description: 'ID driver', example: '10' })
  @IsOptional()
  @IsString()
  driver_id?: string;

  @ApiPropertyOptional({ description: 'ID assistant driver', example: '11' })
  @IsOptional()
  @IsString()
  assistant_id?: string;

  @ApiPropertyOptional({ description: 'Biaya BBM', example: 150000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fuel_cost?: number;

  @ApiPropertyOptional({ description: 'Biaya tol', example: 45000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  toll_fee?: number;

  @ApiPropertyOptional({ description: 'Biaya parkir', example: 20000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  parking_fee?: number;

  @ApiPropertyOptional({ description: 'Biaya inap', example: 120000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stay_cost?: number;

  @ApiPropertyOptional({ description: 'Catatan biaya', example: 'BBM Pertamax + tol lingkar luar' })
  @IsOptional()
  @IsString()
  expense_notes?: string;

  @ApiPropertyOptional({ description: 'Attachment (url/path)', example: 'https://files.example.com/bukti.jpg' })
  @IsOptional()
  @IsString()
  attachment?: string;

  @ApiPropertyOptional({ description: 'Status trip sheet', enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class UpdateTripSheetDto extends PartialType(CreateTripSheetDto) {}

export class UpdateTripSheetPublicDto {
  @ApiPropertyOptional({ description: 'ID driver', example: '10' })
  @IsOptional()
  @IsString()
  driver_id?: string;

  @ApiPropertyOptional({ description: 'ID assistant driver', example: '11' })
  @IsOptional()
  @IsString()
  assistant_id?: string;

  @ApiPropertyOptional({ description: 'Biaya BBM', example: 150000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fuel_cost?: number;

  @ApiPropertyOptional({ description: 'Biaya tol', example: 45000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  toll_fee?: number;

  @ApiPropertyOptional({ description: 'Biaya parkir', example: 20000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  parking_fee?: number;

  @ApiPropertyOptional({ description: 'Biaya inap', example: 120000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stay_cost?: number;

  @ApiPropertyOptional({ description: 'Catatan biaya', example: 'BBM Pertamax + tol lingkar luar' })
  @IsOptional()
  @IsString()
  expense_notes?: string;

  @ApiPropertyOptional({ description: 'Attachment (url/path)', example: 'https://files.example.com/bukti.jpg' })
  @IsOptional()
  @IsString()
  attachment?: string;

  @ApiPropertyOptional({ description: 'Status trip sheet', enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class QueryTripSheetDto {
  @ApiPropertyOptional({ description: 'Halaman saat ini', example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', example: '10' })
  @IsOptional()
  @IsNumberString()
  perPage?: string;

  @ApiPropertyOptional({ description: 'Cari berdasarkan destination / expense_notes', example: 'Bandara' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Field untuk sorting', example: 'created_at' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Arah sorting', enum: ['asc', 'desc'], example: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Filter status', enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({ description: 'Filter order_id', example: '1' })
  @IsOptional()
  @IsString()
  order_id?: string;

  @ApiPropertyOptional({ description: 'Filter driver_id', example: '10' })
  @IsOptional()
  @IsString()
  driver_id?: string;

  @ApiPropertyOptional({ description: 'Filter dari tanggal', example: '2025-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter sampai tanggal', example: '2025-04-30T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}

