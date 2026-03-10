import { Module } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { VehicleController } from './vehicle.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PermissionGuard } from 'src/guard/permission.guard';

@Module({
  imports: [PrismaModule],
  providers: [VehicleService, PermissionGuard],
  controllers: [VehicleController],
  exports: [VehicleService],
})
export class VehicleModule {}
