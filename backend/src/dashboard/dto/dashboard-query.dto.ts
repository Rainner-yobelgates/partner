import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumberString, IsOptional, Max, Min } from 'class-validator';

export class QueryDashboardDto {
  @ApiPropertyOptional({ description: 'Tahun filter', example: 2026, minimum: 2000, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ description: 'ID client (opsional, untuk section klien)', example: '1' })
  @IsOptional()
  @IsNumberString()
  client_id?: string;
}
