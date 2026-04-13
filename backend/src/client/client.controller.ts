import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserType } from 'src/decorator/current-user.decorator';
import { Permission } from 'src/decorator/permission.decorator';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { PermissionGuard } from 'src/guard/permission.guard';
import { ClientService } from './client.service';
import { CreateClientDto, QueryClientDto, UpdateClientDto } from './dto/client.dto';

@ApiTags('Clients')
@Controller('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  @Permission('client', 'read')
  @ApiOperation({ summary: 'Ambil semua client' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findAll(@Query() query: QueryClientDto) {
    return this.clientService.findAll(query);
  }

  @Get(':uuid')
  @Permission('client', 'detail')
  @ApiOperation({ summary: 'Ambil detail client by UUID' })
  @ApiParam({ name: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' })
  findOne(@Param('uuid') uuid: string) {
    return this.clientService.findOne(uuid);
  }

  @Post()
  @Permission('client', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Buat client baru' })
  @ApiBody({ type: CreateClientDto })
  create(@Body() dto: CreateClientDto, @CurrentUser() user: CurrentUserType) {
    return this.clientService.create(dto, user);
  }

  @Put(':id')
  @Permission('client', 'update')
  @ApiOperation({ summary: 'Update client by ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdateClientDto })
  update(
    @Param('id') id: number,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.clientService.update(id, dto, user);
  }

  @Delete(':id')
  @Permission('client', 'delete')
  @ApiOperation({ summary: 'Hapus client by ID (soft delete)' })
  @ApiParam({ name: 'id', example: 1 })
  remove(@Param('id') id: number, @CurrentUser() user: CurrentUserType) {
    return this.clientService.remove(id, user);
  }
}
