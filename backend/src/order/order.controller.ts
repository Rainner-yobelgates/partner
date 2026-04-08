import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateOrderDto, UpdateOrderDto, QueryOrderDto } from './dto/order.dto';
import { OrderService } from './order.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { Permission } from 'src/decorator/permission.decorator';
import { PermissionGuard } from 'src/guard/permission.guard';
import { CurrentUser, CurrentUserType } from 'src/decorator/current-user.decorator';
import { OrderStatus } from 'generated/prisma/enums';

@ApiTags('Orders')
@Controller('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @Permission('order', 'read')
  @ApiOperation({
    summary: 'Ambil semua data order',
    description:
      'Menampilkan daftar order dengan pagination, search, filter status, dan sorting.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Halaman saat ini' })
  @ApiQuery({ name: 'perPage', required: false, example: '10', description: 'Jumlah data per halaman' })
  @ApiQuery({ name: 'search', required: false, example: 'ORD-2025', description: 'Cari berdasarkan order_number / customer' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at', description: 'Field untuk sorting' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc', description: 'Arah sorting' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus, description: 'Filter berdasarkan status order' })
  @ApiQuery({ name: 'date_from', required: false, example: '2025-04-01T00:00:00.000Z', description: 'Filter dari tanggal penggunaan' })
  @ApiQuery({ name: 'date_to', required: false, example: '2025-04-30T23:59:59.999Z', description: 'Filter sampai tanggal penggunaan' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query() query: QueryOrderDto) {
    return this.orderService.findAll(query);
  }

  @Get(':uuid')
  @Permission('order', 'detail')
  @ApiOperation({
    summary: 'Ambil detail order by UUID',
    description: 'Menampilkan detail satu order beserta kendaraan & trip sheet.',
  })
  @ApiParam({ name: 'uuid', description: 'UUID order (orders_uuid)', example: '550e8400-e29b-41d4-a716-446655440000' })
  findOne(@Param('uuid') uuid: string) {
    return this.orderService.findOne(uuid);
  }

  @Post()
  @Permission('order', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Buat order baru',
    description: 'Membuat order baru beserta kendaraan dan generate link trip sheet.',
  })
  @ApiBody({ type: CreateOrderDto })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: CurrentUserType) {
    return this.orderService.create(dto, user);
  }

  @Put(':id')
  @Permission('order', 'update')
  @ApiOperation({
    summary: 'Update order by ID',
    description: 'Memperbarui data order berdasarkan id. Semua field bersifat opsional.',
  })
  @ApiParam({ name: 'id', description: 'ID order (integer)', example: 1 })
  @ApiBody({ type: UpdateOrderDto })
  update(
    @Param('id') id: number,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.orderService.update(id, dto, user);
  }

  @Delete(':id')
  @Permission('order', 'delete')
  @ApiOperation({
    summary: 'Hapus order by ID (soft delete)',
    description:
      'Menghapus order secara soft delete. Data tidak benar-benar dihapus dari database, hanya mengisi deleted_at dan deleted_by.',
  })
  @ApiParam({ name: 'id', description: 'ID order (integer)', example: 1 })
  remove(@Param('id') id: number, @CurrentUser() user: CurrentUserType) {
    return this.orderService.remove(id, user);
  }
}
