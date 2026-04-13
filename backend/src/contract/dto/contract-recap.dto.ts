import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

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
}
