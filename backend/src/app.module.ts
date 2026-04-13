import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { AuthModule } from './auth/auth.module';
import { ClientModule } from './client/client.module';
import { ContractModule } from './contract/contract.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DriverModule } from './driver/driver.module';
import { FacilityModule } from './facility/facility.module';
import { OrderModule } from './order/order.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoleModule } from './role/role.module';
import { RouteModule } from './route/route.module';
import { ShuttleModule } from './shuttle/shuttle.module';
import { TripSheetModule } from './trip_sheet/trip-sheet.module';
import { UserModule } from './user/user.module';
import { VehicleServiceModule } from './vehicle_service/vehicle-service.module';
import { VehicleModule } from './vehicle/vehicle.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    RoleModule,
    DriverModule,
    VehicleModule,
    RouteModule,
    VehicleServiceModule,
    FacilityModule,
    ClientModule,
    ContractModule,
    DashboardModule,
    ShuttleModule,
    UserModule,
    OrderModule,
    TripSheetModule,
  ],
})
export class AppModule {}
