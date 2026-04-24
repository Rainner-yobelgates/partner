import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { PermissionGuard } from 'src/guard/permission.guard';
import { QueryDashboardDto } from './dto/dashboard-query.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Ringkasan dashboard',
    description:
      'Mengembalikan ringkasan master data, report tahunan, finansial klien, finansial reservasi, dan total keuangan.',
  })
  @ApiQuery({ name: 'year', required: false, example: 2026, description: 'Filter tahun (default: tahun saat ini)' })
  @ApiQuery({ name: 'client_id', required: false, example: '1', description: 'Filter client untuk section klien' })
  overview(@Query() query: QueryDashboardDto) {
    return this.dashboardService.overview(query.year, query.client_id);
  }
}
