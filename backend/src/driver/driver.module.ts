import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DriverService } from './driver.service';
import { PermissionGuard } from 'src/guard/permission.guard';
import { DriverController } from './driver.controller';

@Module({
    imports: [PrismaModule],
    providers: [DriverService, PermissionGuard],
    controllers: [DriverController],
    exports: [DriverService],
})
export class DriverModule {}
