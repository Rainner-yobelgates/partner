import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import {
  CreateRoleDto,
  UpdateRoleDto,
  QueryRoleDto,
} from './dto/role.dto';
import {
  ToggleRolePermissionDto,
  UpdateRolePermissionsDto,
} from './dto/role-permission.dto';
import { RolesService } from './role.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { Permission } from 'src/decorator/permission.decorator';
import { PermissionGuard } from 'src/guard/permission.guard';
import { CurrentUser, CurrentUserType } from 'src/decorator/current-user.decorator';

@ApiTags('Roles')
@Controller('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permission('role', 'read')
  @ApiOperation({
    summary: 'Ambil semua role',
    description: 'Menampilkan daftar role dengan pagination, search, dan sorting untuk kebutuhan datatable.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Halaman saat ini' })
  @ApiQuery({ name: 'perPage', required: false, example: '10', description: 'Jumlah data per halaman' })
  @ApiQuery({ name: 'search', required: false, example: 'admin', description: 'Cari berdasarkan name/description' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at', description: 'Field untuk sorting' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc', description: 'Arah sorting' })
  @ApiResponse({ status: 200, description: 'Data role berhasil diambil' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query() query: QueryRoleDto) {
    return this.rolesService.findAll(query);
  }

  @Get(':uuid')
  @Permission('role', 'detail')
  @ApiOperation({
    summary: 'Ambil detail role by UUID',
    description: 'Menampilkan detail satu role berdasarkan role_uuid.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID role (role_uuid)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: 'Detail role berhasil diambil' })
  @ApiResponse({ status: 404, description: 'Role tidak ditemukan' })
  findOne(@Param('uuid') uuid: string) {
    return this.rolesService.findOne(uuid);
  }

  @Post()
  @Permission('role', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Buat role baru',
    description: 'Membuat role baru. Field `name` wajib diisi dan harus unik.',
  })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({ status: 201, description: 'Role berhasil dibuat' })
  @ApiResponse({ status: 409, description: 'Nama role sudah digunakan' })
  @ApiResponse({ status: 400, description: 'Validasi input gagal' })
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: CurrentUserType) {
    return this.rolesService.create(dto, user);
  }

  @Put(':id')
  @Permission('role', 'update')
  @ApiOperation({
    summary: 'Update role by ID',
    description: 'Memperbarui data role berdasarkan id. Semua field bersifat opsional.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID role (integer)',
    example: 1,
  })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ status: 200, description: 'Role berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Role tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Nama role sudah digunakan' })
  update(@Param('id') id: number, @Body() dto: UpdateRoleDto, @CurrentUser() user: CurrentUserType) {
    return this.rolesService.update(id, dto, user);
  }

  @Get(':id/permissions')
  @Permission('role', 'detail')
  @ApiOperation({
    summary: 'Ambil daftar permission untuk role tertentu',
    description: 'Mengembalikan seluruh permission beserta status aktif/nonaktif pada role.',
  })
  @ApiParam({ name: 'id', description: 'ID role (integer)', example: 1 })
  getRolePermissions(@Param('id') id: number) {
    return this.rolesService.getPermissionsByRole(id);
  }

  @Put(':id/permissions')
  @Permission('role', 'update')
  @ApiOperation({
    summary: 'Simpan daftar permission aktif untuk role',
    description: 'Menerima array permission id, lalu mengaktifkan yang dipilih dan menonaktifkan sisanya.',
  })
  @ApiParam({ name: 'id', description: 'ID role (integer)', example: 1 })
  updateRolePermissions(
    @Param('id') id: number,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.rolesService.updateRolePermissions(id, dto, user);
  }

  @Patch(':id/permissions/:permissionId')
  @Permission('role', 'update')
  @ApiOperation({
    summary: 'Toggle active/inactive permission pada role',
    description: 'Mengaktifkan atau menonaktifkan satu permission untuk role.',
  })
  @ApiParam({ name: 'id', description: 'ID role (integer)', example: 1 })
  @ApiParam({ name: 'permissionId', description: 'ID permission (integer)', example: 5 })
  toggleRolePermission(
    @Param('id') id: number,
    @Param('permissionId') permissionId: number,
    @Body() dto: ToggleRolePermissionDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.rolesService.toggleRolePermission(id, permissionId, dto.active, user);
  }

  @Delete(':id')
  @Permission('role', 'delete')
  @ApiOperation({
    summary: 'Hapus role by ID (soft delete)',
    description: 'Menghapus role secara soft delete berdasarkan id. Data tidak benar-benar dihapus dari database, hanya mengisi `deleted_at` dan `deleted_by`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID role (integer)',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Role berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'Role tidak ditemukan atau sudah dihapus' })
  remove(@Param('id') id: number, @CurrentUser() user: CurrentUserType) {
    return this.rolesService.remove(id, user);
  }
}
