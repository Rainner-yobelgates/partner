import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { RoleModule } from './role/role.module';
import { DriverService } from './driver/driver.service';
import { DriverController } from './driver/driver.controller';
import { DriverModule } from './driver/driver.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { RouteModule } from './route/route.module';
import { VehicleServiceModule } from './vehicle_service/vehicle-service.module';
import { FacilityModule } from './facility/facility.module';
import { ContractController } from './contract/contract.controller';
import { ContractModule } from './contract/contract.module';
import { ShuttleModule } from './shuttle/shuttle.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, RoleModule, DriverModule, VehicleModule, RouteModule, VehicleServiceModule, FacilityModule, ContractModule, ShuttleModule, UserModule],
  providers: [DriverService],
  controllers: [DriverController, ContractController],
})
export class AppModule {}
