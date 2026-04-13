import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PermissionGuard } from 'src/guard/permission.guard';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';

@Module({
  imports: [PrismaModule],
  providers: [ClientService, PermissionGuard],
  controllers: [ClientController],
  exports: [ClientService],
})
export class ClientModule {}
