import { Module } from '@nestjs/common';
import { FacilityService } from './facility.service';
import { FacilityController } from './facility.controller';
import { PermissionGuard } from 'src/guard/permission.guard';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [FacilityService, PermissionGuard],
    controllers: [FacilityController],
    exports: [FacilityService],
})
export class FacilityModule {}
