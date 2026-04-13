import { Module } from '@nestjs/common';
import { PermissionGuard } from 'src/guard/permission.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrderController],
  providers: [OrderService, PermissionGuard],
  exports: [OrderService],
})
export class OrderModule {}
