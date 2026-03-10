import { Module } from '@nestjs/common';
import { ShuttleService } from './shuttle.service';
import { ShuttleController } from './shuttle.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PermissionGuard } from 'src/guard/permission.guard';

@Module({
  imports: [PrismaModule],
  providers: [ShuttleService, PermissionGuard],
  controllers: [ShuttleController],
  exports: [ShuttleService],
})
export class ShuttleModule {}
