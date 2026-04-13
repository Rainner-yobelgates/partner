import { Module } from '@nestjs/common';
import { PermissionGuard } from 'src/guard/permission.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [PrismaModule],
  providers: [DashboardService, PermissionGuard],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
