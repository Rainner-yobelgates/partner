import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { OrderStatus, Status } from 'generated/prisma/enums';
import { IsMoneyAmountOptional } from 'src/utils/money-field.decorator';

export class CreateOrderVehicleDto {
  @ApiProperty({ description: 'ID kendaraan', example: '1' })
  @IsString()
  vehicle_id!: string;

  @ApiPropertyOptional({ description: 'ID driver', example: '10' })
  @IsOptional()
  @IsString()
  driver_id?: string;

  @ApiPropertyOptional({ description: 'ID assistant driver', example: '11' })
  @IsOptional()
  @IsString()
  assistant_driver_id?: string;

  @ApiPropertyOptional({ description: 'Status order vehicle', enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Nomor order', example: 'ORD-2025-0002' })
  @IsOptional()
  @IsString()
  order_number?: string;

  @ApiPropertyOptional({ description: 'Nama customer', example: 'PT. Maju Jaya' })
  @IsOptional()
  @IsString()
  customer_name?: string;

  @ApiPropertyOptional({ description: 'Telepon customer', example: '021-888888' })
  @IsOptional()
  @IsString()
  customer_phone?: string;

  @ApiPropertyOptional({ description: 'Email customer', example: 'booking@majujaya.co.id' })
  @IsOptional()
  @IsEmail()
  customer_email?: string;

  @ApiPropertyOptional({ description: 'Tanggal order', example: '2025-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  order_date?: string;

  @ApiPropertyOptional({ description: 'Tanggal penggunaan', example: '2025-04-20T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  usage_date?: string;

  @ApiPropertyOptional({ description: 'Tanggal mulai', example: '2025-04-20T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'Tanggal selesai', example: '2025-04-21T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  finish_date?: string;

  @ApiPropertyOptional({ description: 'Standby time', example: '2025-04-20T07:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  standby_time?: string;

  @ApiPropertyOptional({ description: 'Pickup location', example: 'Wisma 46, Jakarta' })
  @IsOptional()
  @IsString()
  pickup_location?: string;

  @ApiPropertyOptional({ description: 'Dropoff location', example: 'Bandara Soekarno-Hatta' })
  @IsOptional()
  @IsString()
  dropoff_location?: string;

  @ApiPropertyOptional({ description: 'Tujuan', example: 'Bandara Soekarno-Hatta' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: 'Total kendaraan', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  total_vehicles?: number;

  @IsMoneyAmountOptional('Total nilai order', '1500000.00')
  total_amount?: string;

  @ApiPropertyOptional({ description: 'Status order', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Catatan', example: 'Siapkan air mineral' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Daftar kendaraan untuk order (boleh lebih dari satu)',
    type: [CreateOrderVehicleDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderVehicleDto)
  vehicles?: CreateOrderVehicleDto[];
}

export class UpdateOrderDto extends PartialType(CreateOrderDto) {}

export class QueryOrderDto {
  @ApiPropertyOptional({ description: 'Halaman saat ini', example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', example: '10' })
  @IsOptional()
  @IsNumberString()
  perPage?: string;

  @ApiPropertyOptional({
    description: 'Cari berdasarkan order_number / customer / email / telepon',
    example: 'ORD-2025',
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

  @ApiPropertyOptional({ description: 'Filter status', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Filter dari tanggal penggunaan', example: '2025-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter sampai tanggal penggunaan', example: '2025-04-30T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}

