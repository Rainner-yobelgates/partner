import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryOrderRecapDto {
  @ApiProperty({ description: 'Bulan (1–12)', example: 4, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ description: 'Tahun', example: 2026, minimum: 2000, maximum: 2100 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiPropertyOptional({
    description: 'Filter tanggal dibuat (created_at) mulai (YYYY-MM-DD atau ISO datetime)',
    example: '2026-04-01',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    description: 'Filter tanggal dibuat (created_at) sampai (YYYY-MM-DD atau ISO datetime)',
    example: '2026-04-30',
  })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}
