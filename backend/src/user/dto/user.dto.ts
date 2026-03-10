import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumberString,
  IsEmail,
  MinLength,
} from 'class-validator';
import { Status } from 'generated/prisma/enums';

// ──────────────────────────────────────────
// CREATE DTO
// ──────────────────────────────────────────
export class CreateUserDto {
  @ApiPropertyOptional({ description: 'ID role yang dimiliki user', example: '1' })
  @IsOptional()
  @IsNumberString()
  role_id?: string;

  @ApiProperty({ description: 'Email user (harus unik)', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Password user (minimal 8 karakter)', example: 'P@ssw0rd!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ description: 'Username user (harus unik)', example: 'budi_santoso' })
  @IsString()
  username!: string;

  @ApiPropertyOptional({
    description: 'Status user',
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
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {
  @ApiPropertyOptional({ description: 'Password baru (minimal 8 karakter)', example: 'NewP@ss1!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

// ──────────────────────────────────────────
// QUERY DTO
// ──────────────────────────────────────────
export class QueryUserDto {
  @ApiPropertyOptional({ description: 'Halaman saat ini', example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', example: '10' })
  @IsOptional()
  @IsNumberString()
  perPage?: string;

  @ApiPropertyOptional({
    description: 'Cari berdasarkan username / email',
    example: 'budi',
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

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID role', example: '1' })
  @IsOptional()
  @IsNumberString()
  role_id?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan status user',
    enum: Status,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}