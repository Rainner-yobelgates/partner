import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PermissionGuard } from 'src/guard/permission.guard';

@Module({
  imports: [PrismaModule],
  providers: [UserService, PermissionGuard],
  controllers: [UserController],
})
export class UserModule {}
