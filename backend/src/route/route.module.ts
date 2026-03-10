import { Module } from '@nestjs/common';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';
import { PermissionGuard } from 'src/guard/permission.guard';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RouteService, PermissionGuard],
  controllers: [RouteController],
  exports: [RouteService],
})
export class RouteModule {}
