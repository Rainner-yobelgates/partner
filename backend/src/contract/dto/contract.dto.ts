import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Status } from 'generated/prisma/enums';
import { IsMoneyAmountOptional } from 'src/utils/money-field.decorator';

export class CreateContractDto {
  @ApiPropertyOptional({ description: 'Nomor kontrak', example: 'KTR-2024-001' })
  @IsOptional()
  @IsString()
  contract_number?: string;

  @ApiProperty({ description: 'ID client', example: '1' })
  @IsNumberString()
  client_id!: string;

  @ApiProperty({ description: 'Bulan kontrak (1-12)', example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  contract_month!: number;

  @ApiProperty({ description: 'Tahun kontrak (YYYY)', example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  contract_year!: number;

  @ApiPropertyOptional({ description: 'Nama contact person', example: 'Budi Santoso' })
  @IsOptional()
  @IsString()
  contact_person?: string;

  @ApiPropertyOptional({ description: 'Nomor telepon contact person', example: '08123456789' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ description: 'Email contact person', example: 'budi@perusahaan.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Alamat perusahaan / klien', example: 'Jl. Sudirman No. 10, Jakarta' })
  @IsOptional()
  @IsString()
  address?: string;

  @IsMoneyAmountOptional('Nilai kontrak', '3500000.00')
  contract_value?: string;

  @ApiPropertyOptional({
    description: 'Status kontrak',
    enum: Status,
    example: Status.ACTIVE,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class UpdateContractDto extends PartialType(CreateContractDto) {}

export class QueryContractDto {
  @ApiPropertyOptional({ description: 'Halaman saat ini', example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', example: '10' })
  @IsOptional()
  @IsNumberString()
  perPage?: string;

  @ApiPropertyOptional({
    description: 'Cari berdasarkan contract_number / contact_person / email / phone_number',
    example: 'KTR-2024',
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
    description: 'Filter berdasarkan status kontrak',
    enum: Status,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({ description: 'Filter berdasarkan client id', example: '1' })
  @IsOptional()
  @IsNumberString()
  client_id?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan bulan kontrak', example: '4' })
  @IsOptional()
  @IsNumberString()
  contract_month?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan tahun kontrak', example: '2026' })
  @IsOptional()
  @IsNumberString()
  contract_year?: string;
}
