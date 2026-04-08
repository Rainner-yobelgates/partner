import { Module } from '@nestjs/common';
import { TripSheetController } from './trip-sheet.controller';
import { TripSheetPublicController } from './trip-sheet.public.controller';
import { TripSheetService } from './trip-sheet.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [TripSheetController, TripSheetPublicController],
  providers: [TripSheetService, PrismaService],
})
export class TripSheetModule {}
