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
import { CreateContractRecapExportDto } from './dto/contract-recap.dto';
import { ContractRecapExportService } from './contract-recap-export.service';

@ApiTags('Contract Recap Export')
@Controller('contract-recap')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ContractRecapExportController {
  constructor(private readonly contractRecapExportService: ContractRecapExportService) {}

  @Post('export')
  @Permission('client-recap', 'read')
  @ApiOperation({
    summary: 'Request export Excel rekap AJK',
    description: 'Membuat job export Excel berdasarkan filter rekap AJK aktif dan langsung mengembalikan job ID.',
  })
  @ApiBody({ type: CreateContractRecapExportDto })
  requestExport(
    @Body() dto: CreateContractRecapExportDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.contractRecapExportService.requestExport(dto, user);
  }

  @Get('export/:jobId/status')
  @Permission('client-recap', 'read')
  @ApiOperation({
    summary: 'Cek status export Excel rekap AJK',
    description: 'Mengembalikan status job dan download URL jika file sudah selesai dibuat.',
  })
  @ApiParam({ name: 'jobId', description: 'ID export job', example: '1' })
  exportStatus(
    @Param('jobId') jobId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.contractRecapExportService.getStatus(jobId, user);
  }

  @Get('export/:jobId/download')
  @Permission('client-recap', 'read')
  @ApiOperation({
    summary: 'Download file Excel rekap AJK',
    description: 'Mengirim file export sebagai attachment jika job sudah selesai dan dimiliki user login.',
  })
  @ApiParam({ name: 'jobId', description: 'ID export job', example: '1' })
  async downloadExport(
    @Param('jobId') jobId: string,
    @CurrentUser() user: CurrentUserType,
    @Res() res: Response,
  ) {
    const file = await this.contractRecapExportService.getDownloadFile(jobId, user);

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
