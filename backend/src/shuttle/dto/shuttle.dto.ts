import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsNumberString,
  IsDateString,
  IsString,
} from 'class-validator';
import { Status } from 'generated/prisma/enums';
import { IsMoneyAmountOptional } from 'src/utils/money-field.decorator';

// ──────────────────────────────────────────
// CREATE DTO
// ──────────────────────────────────────────
export class CreateShuttleDto {
  @ApiProperty({ description: 'ID klien pemilik pemeliharaan antar jemput', example: '1' })
  @IsNumberString()
  client_id!: string;

  @ApiPropertyOptional({ description: 'ID kendaraan yang digunakan', example: '2' })
  @IsOptional()
  @IsNumberString()
  vehicle_id?: string;

  @ApiPropertyOptional({ description: 'ID rute yang digunakan', example: '3' })
  @IsOptional()
  @IsNumberString()
  route_id?: string;

  @IsMoneyAmountOptional('Insentif kru', '150000.00')
  crew_incentive?: string;

  @ApiPropertyOptional({
    description: 'Tanggal jadwal shuttle (ISO 8601)',
    example: '2024-06-15T07:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduled_date?: string;

  @IsMoneyAmountOptional('Biaya bahan bakar', '200000.00')
  fuel?: string;

  @IsMoneyAmountOptional('Biaya tol', '50000.00')
  toll_fee?: string;

  @IsMoneyAmountOptional('Biaya lainnya', '0.00')
  others?: string;

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

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID klien', example: '1' })
  @IsOptional()
  @IsNumberString()
  client_id?: string;

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
