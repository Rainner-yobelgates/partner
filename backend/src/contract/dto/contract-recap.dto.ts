import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumberString, IsOptional } from 'class-validator';

export class QueryContractRecapDto {
  @ApiProperty({ description: 'ID client (numerik)', example: '1' })
  @IsNumberString()
  client_id!: string;

  @ApiProperty({ description: 'Bulan (1-12)', example: '4' })
  @IsNumberString()
  month!: string;

  @ApiProperty({ description: 'Tahun (YYYY)', example: '2026' })
  @IsNumberString()
  year!: string;

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
