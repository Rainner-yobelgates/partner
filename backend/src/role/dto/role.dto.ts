import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumberString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from 'generated/prisma/enums';

// ─────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────
export class CreateRoleDto {
  @ApiProperty({
    example: 'admin',
    description: 'Nama role (harus unik)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nama wajib diisi' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Administrator dengan akses penuh',
    description: 'Deskripsi role',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: Status,
    example: Status.ACTIVE,
    description: 'Status role',
  })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;
}

// ─────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────
export class UpdateRoleDto {
  @ApiPropertyOptional({
    example: 'editor',
    description: 'Nama role baru (harus unik)',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Dapat mengelola konten',
    description: 'Deskripsi role baru',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: Status,
    example: Status.INACTIVE,
    description: 'Status role baru',
  })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;
}

// ─────────────────────────────────────────
// QUERY (Pagination + Datatable)
// ─────────────────────────────────────────
export class QueryRoleDto {
  @ApiPropertyOptional({
    example: '1',
    description: 'Halaman saat ini',
    default: '1',
  })
  @IsNumberString()
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({
    example: '10',
    description: 'Jumlah data per halaman',
    default: '10',
  })
  @IsNumberString()
  @IsOptional()
  perPage?: string;

  @ApiPropertyOptional({
    example: 'admin',
    description: 'Kata kunci pencarian berdasarkan name atau description',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: 'created_at',
    description: 'Field yang digunakan untuk sorting',
    default: 'created_at',
  })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Arah sorting',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}