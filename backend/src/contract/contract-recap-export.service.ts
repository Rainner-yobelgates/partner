import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { basename, isAbsolute, join, relative, resolve } from 'path';
import { ExportJobStatus } from 'generated/prisma/enums';
import { CurrentUserType } from 'src/decorator/current-user.decorator';
import { normalizeUserId } from 'src/utils/normalize-user-id.util';
import { resolveUploadRoot } from 'src/utils/upload-path.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractRecapExportDto } from './dto/contract-recap.dto';
import { ContractService } from './contract.service';

const CONTRACT_RECAP_EXPORT_MODULE = 'CONTRACT_RECAP';

type ContractRecapExportFilters = {
  client_id: string;
  month: number;
  year: number;
  date_from?: string;
  date_to?: string;
};

type DownloadFile = {
  path: string;
  fileName: string;
};

@Injectable()
export class ContractRecapExportService implements OnModuleInit {
  private readonly batchSize = 500;
  private readonly cleanupAfterDays = 7;
  private readonly processingJobs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly contractService: ContractService,
  ) {}

  onModuleInit() {
    setImmediate(() => {
      void this.resumePendingJobs();
      void this.cleanupOldExports();
    });
  }

  async requestExport(dto: CreateContractRecapExportDto, user: CurrentUserType) {
    const userId = this.getAuthenticatedUserId(user);
    const filters = this.normalizeFilters(dto);

    await this.contractService.buildContractRecapQueryContext(
      filters.client_id,
      filters.month,
      filters.year,
      filters.date_from,
      filters.date_to,
    );

    const exportJob = await this.prisma.db.exportJob.create({
      data: {
        module_name: CONTRACT_RECAP_EXPORT_MODULE,
        status: ExportJobStatus.PENDING,
        filters: { ...filters },
        created_by: userId,
      },
    });

    this.dispatch(exportJob.id);

    return {
      success: true,
      jobId: exportJob.id.toString(),
      message: 'Export is being processed',
      data: {
        jobId: exportJob.id.toString(),
        status: this.toApiStatus(exportJob.status),
      },
    };
  }

  async getStatus(jobId: string, user: CurrentUserType) {
    const exportJob = await this.findOwnedJob(jobId, user);

    return {
      success: true,
      data: this.serializeJob(exportJob),
    };
  }

  async getDownloadFile(jobId: string, user: CurrentUserType): Promise<DownloadFile> {
    const exportJob = await this.findOwnedJob(jobId, user);

    if (exportJob.status !== ExportJobStatus.COMPLETED) {
      throw new BadRequestException({
        success: false,
        message: 'File export belum selesai diproses.',
      });
    }

    if (!exportJob.file_path) {
      throw new NotFoundException({
        success: false,
        message: 'File export tidak ditemukan atau sudah kedaluwarsa.',
      });
    }

    const absolutePath = this.resolveStoredFilePath(exportJob.file_path);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException({
        success: false,
        message: 'File export tidak ditemukan di storage.',
      });
    }

    return {
      path: absolutePath,
      fileName: exportJob.file_name ?? basename(absolutePath),
    };
  }

  private async resumePendingJobs() {
    try {
      const jobs = await this.prisma.db.exportJob.findMany({
        where: {
          module_name: CONTRACT_RECAP_EXPORT_MODULE,
          status: { in: [ExportJobStatus.PENDING, ExportJobStatus.PROCESSING] },
        },
        orderBy: { created_at: 'asc' },
        take: 3,
        select: { id: true },
      });

      jobs.forEach((job) => this.dispatch(job.id));
    }
    catch (error) {
      console.error('[ContractRecapExportService] Failed to resume export jobs', error);
    }
  }

  private dispatch(exportJobId: bigint) {
    const key = exportJobId.toString();
    if (this.processingJobs.has(key))
      return;

    this.processingJobs.add(key);

    setImmediate(async () => {
      try {
        await this.processExport(exportJobId);
      }
      finally {
        this.processingJobs.delete(key);
      }
    });
  }

  private async processExport(exportJobId: bigint) {
    const exportJob = await this.prisma.db.exportJob.findUnique({
      where: { id: exportJobId },
    });

    if (
      !exportJob
      || exportJob.module_name !== CONTRACT_RECAP_EXPORT_MODULE
      || (exportJob.status !== ExportJobStatus.PENDING
        && exportJob.status !== ExportJobStatus.PROCESSING)
    ) {
      return;
    }

    await this.prisma.db.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: ExportJobStatus.PROCESSING,
        error_message: null,
      },
    });

    try {
      const filters = this.parseStoredFilters(exportJob.filters);
      const context = await this.contractService.buildContractRecapQueryContext(
        filters.client_id,
        filters.month,
        filters.year,
        filters.date_from,
        filters.date_to,
      );
      const fileName = this.buildFileName(exportJob.id, context);
      const filePath = this.buildStoredFilePath(fileName);
      const absolutePath = this.resolveStoredFilePath(filePath);

      mkdirSync(this.exportDirectory, { recursive: true });

      await this.writeExcelFile(absolutePath, context);

      await this.prisma.db.exportJob.update({
        where: { id: exportJobId },
        data: {
          status: ExportJobStatus.COMPLETED,
          file_name: fileName,
          file_path: filePath,
          completed_at: new Date(),
        },
      });
    }
    catch (error) {
      console.error('[ContractRecapExportService] Failed to process export job', error);
      await this.prisma.db.exportJob.update({
        where: { id: exportJobId },
        data: {
          status: ExportJobStatus.FAILED,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date(),
        },
      });
    }
  }

  private async writeExcelFile(
    absolutePath: string,
    context: Awaited<ReturnType<ContractService['buildContractRecapQueryContext']>>,
  ) {
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: absolutePath,
      useStyles: true,
      useSharedStrings: true,
    });

    const worksheet = workbook.addWorksheet('Rekap AJK', {
      views: [{ state: 'frozen', ySplit: 7 }],
    });
    worksheet.columns = [
      { key: 'no', width: 8 },
      { key: 'scheduled_date', width: 18, style: { numFmt: 'dd/mm/yyyy' } },
      { key: 'route', width: 36 },
      { key: 'vehicle', width: 20 },
      { key: 'vehicle_type', width: 18 },
      { key: 'status', width: 14 },
      { key: 'crew_incentive', width: 18, style: { numFmt: '#,##0.00' } },
      { key: 'fuel', width: 18, style: { numFmt: '#,##0.00' } },
      { key: 'toll_fee', width: 18, style: { numFmt: '#,##0.00' } },
      { key: 'others', width: 18, style: { numFmt: '#,##0.00' } },
      { key: 'total_cost', width: 18, style: { numFmt: '#,##0.00' } },
    ];

    const tableHeader = [
      'No',
      'Jadwal',
      'Rute Antar Jemput',
      'Kendaraan',
      'Tipe Kendaraan',
      'Status',
      'Insentif Crew',
      'BBM',
      'Tol',
      'Lain-lain',
      'Total Biaya',
    ];
    const moneyFormat = '#,##0.00';
    const border = {
      top: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
    };
    const contractValue = this.toNumber(context.contract?.contract_value?.toString() ?? null);
    const periodText = context.periodLabel;
    const createdFilterText = this.buildCreatedFilterText(context.filter.created_from, context.filter.created_to_before);
    const generatedAt = new Date();

    const titleRow = worksheet.addRow(['REKAP AJK']);
    worksheet.mergeCells('A1:K1');
    titleRow.height = 24;
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.commit();

    const clientRow = worksheet.addRow([`Client: ${context.client.name}${context.client.code ? ` (${context.client.code})` : ''}`]);
    worksheet.mergeCells('A2:K2');
    clientRow.getCell(1).font = { bold: true, color: { argb: 'FF1F2937' } };
    clientRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF3F8' } };
    clientRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    clientRow.commit();

    const periodRow = worksheet.addRow([`Periode: ${periodText} | Created: ${createdFilterText}`]);
    worksheet.mergeCells('A3:K3');
    periodRow.getCell(1).font = { color: { argb: 'FF374151' } };
    periodRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    periodRow.commit();

    const contractRow = worksheet.addRow([
      `Kontrak: ${context.contract?.contract_number ?? '-'} | Nilai kontrak: ${contractValue}`,
    ]);
    worksheet.mergeCells('A4:K4');
    contractRow.getCell(1).font = { color: { argb: 'FF374151' } };
    contractRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    contractRow.commit();

    const generatedRow = worksheet.addRow([`Dibuat: ${this.formatDateTime(generatedAt)}`]);
    worksheet.mergeCells('A5:K5');
    generatedRow.getCell(1).font = { italic: true, color: { argb: 'FF4B5563' } };
    generatedRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    generatedRow.commit();

    worksheet.addRow([]).commit();

    const header = worksheet.addRow(tableHeader);
    header.height = 20;
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = border;
    });
    header.commit();

    let cursorId: bigint | undefined;
    let rowNo = 1;
    let totalCrew = 0;
    let totalFuel = 0;
    let totalToll = 0;
    let totalOthers = 0;
    let totalExpense = 0;

    while (true) {
      const batch = await this.contractService.findContractRecapShuttlesBatch(context, this.batchSize, cursorId);

      if (!batch.length)
        break;

      for (const shuttle of batch) {
        const row = this.contractService.buildContractRecapShuttleRow(shuttle);
        const crew = this.toNumber(row.crew_incentive);
        const fuel = this.toNumber(row.fuel);
        const toll = this.toNumber(row.toll_fee);
        const others = this.toNumber(row.others);
        const totalCost = this.toNumber(row.total_cost);
        const dataRow = worksheet.addRow({
          no: rowNo,
          scheduled_date: row.scheduled_date,
          route: `${row.route_origin || '-'} -> ${row.route_destination || '-'}`,
          vehicle: row.vehicle_plate_number ?? '',
          vehicle_type: row.vehicle_type ?? '',
          status: row.status ?? '',
          crew_incentive: crew,
          fuel,
          toll_fee: toll,
          others,
          total_cost: totalCost,
        });

        dataRow.eachCell((cell, colNumber) => {
          cell.border = border;
          cell.alignment = {
            horizontal: colNumber === 1 || colNumber === 6
              ? 'center'
              : (colNumber >= 7 ? 'right' : 'left'),
            vertical: 'middle',
            wrapText: colNumber === 3,
          };
        });
        dataRow.getCell(2).numFmt = 'dd/mm/yyyy';
        for (let col = 7; col <= 11; col += 1)
          dataRow.getCell(col).numFmt = moneyFormat;

        if (rowNo % 2 === 0) {
          dataRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
        }

        dataRow.commit();

        totalCrew += crew;
        totalFuel += fuel;
        totalToll += toll;
        totalOthers += others;
        totalExpense += totalCost;
        cursorId = shuttle.id;
        rowNo += 1;
      }

      if (batch.length < this.batchSize)
        break;
    }

    const totalProfit = contractValue - totalExpense;

    worksheet.addRow([]).commit();
    const summaryTitle = worksheet.addRow(['RINGKASAN']);
    worksheet.mergeCells(`A${summaryTitle.number}:D${summaryTitle.number}`);
    summaryTitle.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summaryTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    summaryTitle.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    summaryTitle.commit();

    [
      ['Total Trip AJK', rowNo - 1],
      ['Nilai Kontrak', contractValue],
      ['Insentif Crew', totalCrew],
      ['BBM', totalFuel],
      ['Tol', totalToll],
      ['Lain-lain', totalOthers],
      ['Total Pengeluaran', totalExpense],
      ['Total Keuntungan', totalProfit],
    ].forEach(([label, value], index) => {
      const summaryRow = worksheet.addRow([label, value]);
      summaryRow.getCell(1).font = { bold: true };
      summaryRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF3F8' } };
      summaryRow.getCell(2).alignment = { horizontal: 'right' };
      summaryRow.eachCell((cell) => {
        cell.border = border;
      });

      if (index >= 1)
        summaryRow.getCell(2).numFmt = moneyFormat;

      summaryRow.commit();
    });

    worksheet.commit();
    await workbook.commit();
  }

  private async findOwnedJob(jobId: string, user: CurrentUserType) {
    const id = this.parseJobId(jobId);
    const userId = this.getAuthenticatedUserId(user);
    const exportJob = await this.prisma.db.exportJob.findFirst({
      where: {
        id,
        created_by: userId,
        module_name: CONTRACT_RECAP_EXPORT_MODULE,
      },
    });

    if (!exportJob) {
      throw new NotFoundException({
        success: false,
        message: 'Data export tidak ditemukan.',
      });
    }

    return exportJob;
  }

  private parseJobId(jobId: string) {
    if (!/^\d+$/.test(String(jobId ?? ''))) {
      throw new BadRequestException({
        success: false,
        message: 'Export job ID tidak valid.',
      });
    }

    return BigInt(jobId);
  }

  private getAuthenticatedUserId(user: CurrentUserType) {
    const userId = normalizeUserId(user);
    if (!userId) {
      throw new BadRequestException({
        success: false,
        message: 'User tidak valid.',
      });
    }

    return userId;
  }

  private normalizeFilters(dto: CreateContractRecapExportDto): ContractRecapExportFilters {
    return {
      client_id: String(dto.client_id),
      month: Number(dto.month),
      year: Number(dto.year),
      ...(dto.date_from ? { date_from: dto.date_from } : {}),
      ...(dto.date_to ? { date_to: dto.date_to } : {}),
    };
  }

  private parseStoredFilters(filters: unknown): ContractRecapExportFilters {
    if (!filters || typeof filters !== 'object') {
      throw new BadRequestException({
        success: false,
        message: 'Filter export tidak valid.',
      });
    }

    const raw = filters as Record<string, unknown>;

    return this.normalizeFilters({
      client_id: String(raw.client_id ?? ''),
      month: String(raw.month ?? ''),
      year: String(raw.year ?? ''),
      ...(typeof raw.date_from === 'string' ? { date_from: raw.date_from } : {}),
      ...(typeof raw.date_to === 'string' ? { date_to: raw.date_to } : {}),
    });
  }

  private serializeJob(exportJob: Awaited<ReturnType<ContractRecapExportService['findOwnedJob']>>) {
    const id = exportJob.id.toString();
    const completed = exportJob.status === ExportJobStatus.COMPLETED && Boolean(exportJob.file_path);

    return {
      id,
      jobId: id,
      status: this.toApiStatus(exportJob.status),
      fileName: exportJob.file_name,
      downloadUrl: completed ? `/contract-recap/export/${id}/download` : null,
      errorMessage: exportJob.error_message,
      createdAt: exportJob.created_at,
      updatedAt: exportJob.updated_at,
      completedAt: exportJob.completed_at,
    };
  }

  private toApiStatus(status: ExportJobStatus) {
    return status.toLowerCase();
  }

  private toNumber(value: string | number | null | undefined) {
    if (value == null || value === '')
      return 0;

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private buildCreatedFilterText(from?: string | null, toBefore?: string | null) {
    if (!from && !toBefore)
      return '-';

    return `${from ? this.formatDateOnly(from) : '-'} s/d ${toBefore ? this.formatDateOnly(this.getInclusiveEndDate(toBefore)) : '-'}`;
  }

  private getInclusiveEndDate(endExclusive: string) {
    const end = new Date(endExclusive);
    end.setUTCDate(end.getUTCDate() - 1);
    return end;
  }

  private formatDateOnly(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
      return '-';

    const pad = (input: number) => String(input).padStart(2, '0');
    return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
  }

  private formatDateTime(value: Date) {
    const pad = (input: number) => String(input).padStart(2, '0');

    return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }

  private buildFileName(
    exportJobId: bigint,
    context: Awaited<ReturnType<ContractService['buildContractRecapQueryContext']>>,
  ) {
    return `contract-recap-export-${context.client.id.toString()}-${context.month}-${context.year}-${exportJobId.toString()}.xlsx`;
  }

  private buildStoredFilePath(fileName: string) {
    return ['exports', 'contract-recap', fileName].join('/');
  }

  private resolveStoredFilePath(filePath: string) {
    const uploadRoot = resolve(resolveUploadRoot());
    const absolutePath = resolve(uploadRoot, filePath);
    const relativePath = relative(uploadRoot, absolutePath);

    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new ForbiddenException({
        success: false,
        message: 'Path file export tidak valid.',
      });
    }

    return absolutePath;
  }

  private get exportDirectory() {
    return join(resolveUploadRoot(), 'exports', 'contract-recap');
  }

  private async cleanupOldExports() {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - this.cleanupAfterDays);

    try {
      const jobs = await this.prisma.db.exportJob.findMany({
        where: {
          module_name: CONTRACT_RECAP_EXPORT_MODULE,
          status: ExportJobStatus.COMPLETED,
          completed_at: { lt: cutoff },
          file_path: { not: null },
        },
        take: 50,
        select: { id: true, file_path: true },
      });

      for (const job of jobs) {
        if (!job.file_path)
          continue;

        const absolutePath = this.resolveStoredFilePath(job.file_path);
        if (existsSync(absolutePath))
          unlinkSync(absolutePath);

        await this.prisma.db.exportJob.update({
          where: { id: job.id },
          data: { file_path: null },
        });
      }
    }
    catch (error) {
      console.error('[ContractRecapExportService] Failed to cleanup export files', error);
    }
  }
}
