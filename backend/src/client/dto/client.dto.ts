import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { Status } from 'generated/prisma/enums';

export class CreateClientDto {
  @ApiProperty({ description: 'Nama client (unik)', example: 'PT. ABC Indonesia' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Kode client (unik)', example: 'ABC' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Nama PIC client', example: 'Budi Santoso' })
  @IsOptional()
  @IsString()
  contact_person?: string;

  @ApiPropertyOptional({ description: 'Nomor telepon', example: '0211234567' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'procurement@abc.co.id' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Alamat', example: 'Jl. Sudirman No. 10, Jakarta' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Status client', enum: Status, example: Status.ACTIVE })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class QueryClientDto {
  @ApiPropertyOptional({ description: 'Halaman saat ini', example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', example: '10' })
  @IsOptional()
  @IsNumberString()
  perPage?: string;

  @ApiPropertyOptional({ description: 'Cari berdasarkan nama / kode / pic / email / telepon', example: 'ABC' })
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
}
