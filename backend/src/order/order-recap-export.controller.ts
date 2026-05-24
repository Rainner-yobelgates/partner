import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, CurrentUserType } from 'src/decorator/current-user.decorator';
import { Permission } from 'src/decorator/permission.decorator';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { PermissionGuard } from 'src/guard/permission.guard';
import { CreateOrderRecapExportDto } from './dto/order-recap.dto';
import { OrderRecapExportService } from './order-recap-export.service';

@ApiTags('Order Recap Export')
@Controller('order-recap')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OrderRecapExportController {
  constructor(private readonly orderRecapExportService: OrderRecapExportService) {}

  @Post('export')
  @Permission('order-recap', 'read')
  @ApiOperation({
    summary: 'Request export Excel rekap reservasi',
    description: 'Membuat job export Excel berdasarkan filter rekap reservasi aktif dan langsung mengembalikan job ID.',
  })
  @ApiBody({ type: CreateOrderRecapExportDto })
  requestExport(
    @Body() dto: CreateOrderRecapExportDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.orderRecapExportService.requestExport(dto, user);
  }

  @Get('export/:jobId/status')
  @Permission('order-recap', 'read')
  @ApiOperation({
    summary: 'Cek status export Excel rekap reservasi',
    description: 'Mengembalikan status job dan download URL jika file sudah selesai dibuat.',
  })
  @ApiParam({ name: 'jobId', description: 'ID export job', example: '1' })
  exportStatus(
    @Param('jobId') jobId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.orderRecapExportService.getStatus(jobId, user);
  }

  @Get('export/:jobId/download')
  @Permission('order-recap', 'read')
  @ApiOperation({
    summary: 'Download file Excel rekap reservasi',
    description: 'Mengirim file export sebagai attachment jika job sudah selesai dan dimiliki user login.',
  })
  @ApiParam({ name: 'jobId', description: 'ID export job', example: '1' })
  async downloadExport(
    @Param('jobId') jobId: string,
    @CurrentUser() user: CurrentUserType,
    @Res() res: Response,
  ) {
    const file = await this.orderRecapExportService.getDownloadFile(jobId, user);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return new Promise<void>((resolve, reject) => {
      res.download(file.path, file.fileName, (error) => {
        if (error)
          reject(error);
        else
          resolve();
      });
    });
  }
}
