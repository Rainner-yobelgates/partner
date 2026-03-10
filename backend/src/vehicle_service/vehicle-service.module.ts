import { Module } from '@nestjs/common';
import { VehicleServiceService } from './vehicle-service.service';
import { PermissionGuard } from 'src/guard/permission.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { VehicleServiceController } from './vehicle-service.controller';

@Module({
  imports: [PrismaModule],
  providers: [VehicleServiceService, PermissionGuard],
  controllers: [VehicleServiceController],
  exports: [VehicleServiceService],
})
export class VehicleServiceModule {}
