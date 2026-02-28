import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RolesService } from './role.service';
import { RolesController } from './role.controller';
import { PermissionGuard } from 'src/guard/permission.guard';

@Module({
  imports: [PrismaModule],
  providers: [RolesService, PermissionGuard],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RoleModule {}
