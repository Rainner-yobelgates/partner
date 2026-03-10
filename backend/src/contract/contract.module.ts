import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PermissionGuard } from 'src/guard/permission.guard';

@Module({
  imports: [PrismaModule],
  providers: [ContractService, PermissionGuard],
  controllers: [ContractController],
  exports: [ContractService],
})
export class ContractModule {}
