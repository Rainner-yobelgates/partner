import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNumberString, IsOptional } from 'class-validator';

export class QueryContractRecapDto {
  @ApiProperty({ description: 'ID client (numerik)', example: '1' })
  @Transform(({ value }) => (value == null ? value : String(value)))
  @IsNumberString()
  client_id!: string;

  @ApiProperty({ description: 'Bulan (1-12)', example: '4' })
  @Transform(({ value }) => (value == null ? value : String(value)))
  @IsNumberString()
  month!: string;

  @ApiProperty({ description: 'Tahun (YYYY)', example: '2026' })
  @Transform(({ value }) => (value == null ? value : String(value)))
  @IsNumberString()
  year!: string;

  @ApiPropertyOptional({
    description: 'Filter tanggal jadwal antar jemput mulai (YYYY-MM-DD atau ISO datetime)',
    example: '2026-04-01',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    description: 'Filter tanggal jadwal antar jemput sampai (YYYY-MM-DD atau ISO datetime)',
    example: '2026-04-30',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString()
  date_to?: string;
}

export class CreateContractRecapExportDto extends QueryContractRecapDto {}
