import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { ContractRecapExportController } from './contract-recap-export.controller';
import { ContractRecapExportService } from './contract-recap-export.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PermissionGuard } from 'src/guard/permission.guard';

@Module({
  imports: [PrismaModule],
  providers: [ContractService, ContractRecapExportService, PermissionGuard],
  controllers: [ContractController, ContractRecapExportController],
  exports: [ContractService],
})
export class ContractModule {}
