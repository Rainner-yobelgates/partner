import { Module } from '@nestjs/common';
import { PermissionGuard } from 'src/guard/permission.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OrderController } from './order.controller';
import { OrderRecapExportController } from './order-recap-export.controller';
import { OrderRecapExportService } from './order-recap-export.service';
import { OrderService } from './order.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrderController, OrderRecapExportController],
  providers: [OrderService, OrderRecapExportService, PermissionGuard],
  exports: [OrderService],
})
export class OrderModule {}
