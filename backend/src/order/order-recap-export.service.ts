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
import { CreateOrderRecapExportDto } from './dto/order-recap.dto';
import { OrderService } from './order.service';

const ORDER_RECAP_EXPORT_MODULE = 'ORDER_RECAP';

type DownloadFile = {
  path: string;
  fileName: string;
};

type OrderRecapExportFilters = {
  month: number;
  year: number;
  date_from?: string;
  date_to?: string;
};

@Injectable()
export class OrderRecapExportService implements OnModuleInit {
  private readonly batchSize = 500;
  private readonly cleanupAfterDays = 7;
  private readonly processingJobs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
  ) {}

  onModuleInit() {
    setImmediate(() => {
      void this.resumePendingJobs();
      void this.cleanupOldExports();
    });
  }

  async requestExport(dto: CreateOrderRecapExportDto, user: CurrentUserType) {
    const userId = this.getAuthenticatedUserId(user);
    const filters = this.normalizeFilters(dto);

    this.orderService.buildRecapQueryContext(filters);

    const exportJob = await this.prisma.db.exportJob.create({
      data: {
        module_name: ORDER_RECAP_EXPORT_MODULE,
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
          module_name: ORDER_RECAP_EXPORT_MODULE,
          status: { in: [ExportJobStatus.PENDING, ExportJobStatus.PROCESSING] },
        },
        orderBy: { created_at: 'asc' },
        take: 3,
        select: { id: true },
      });

      jobs.forEach((job) => this.dispatch(job.id));
    }
    catch (error) {
      console.error('[OrderRecapExportService] Failed to resume export jobs', error);
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
      || exportJob.module_name !== ORDER_RECAP_EXPORT_MODULE
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
      const context = this.orderService.buildRecapQueryContext(filters);
      const fileName = this.buildFileName(exportJob.id, context);
      const filePath = this.buildStoredFilePath(fileName);
      const absolutePath = this.resolveStoredFilePath(filePath);

      mkdirSync(this.exportDirectory, { recursive: true });

      await this.writeExcelFile(absolutePath, filters, context);

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
      console.error('[OrderRecapExportService] Failed to process export job', error);
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
    filters: OrderRecapExportFilters,
    context: ReturnType<OrderService['buildRecapQueryContext']>,
  ) {
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: absolutePath,
      useStyles: true,
      useSharedStrings: true,
    });

    const worksheet = workbook.addWorksheet('Order Recap', {
      views: [{ state: 'frozen', ySplit: 5 }],
    });
    worksheet.columns = [
      { key: 'no', width: 8 },
      { key: 'order_number', width: 24 },
      { key: 'customer_name', width: 28 },
      { key: 'customer_phone', width: 18 },
      { key: 'destination', width: 36 },
      { key: 'created_at', width: 20, style: { numFmt: 'dd/mm/yyyy hh:mm' } },
      { key: 'status', width: 16 },
      { key: 'trip_sheet_count', width: 12 },
      { key: 'income', width: 18, style: { numFmt: '#,##0.00' } },
      { key: 'driver_allowance', width: 18, style: { numFmt: '#,##0.00' } },
      { key: 'expense_crew', width: 18, style: { numFmt: '#,##0.00' } },
      { key: 'expense_fuel', width: 18, style: { numFmt: '#,##0.00' } },
      { key: 'expense_toll', width: 18, style: { numFmt: '#,##0.00' } },
      { key: 'expense_parking', width: 18, style: { numFmt: '#,##0.00' } },
      { key: 'expense_stay', width: 18, style: { numFmt: '#,##0.00' } },
      { key: 'expense_others', width: 18, style: { numFmt: '#,##0.00' } },
      { key: 'total_expense', width: 18, style: { numFmt: '#,##0.00' } },
      { key: 'profit', width: 18, style: { numFmt: '#,##0.00' } },
    ];

    const tableHeader = [
      'No',
      'No. Reservasi',
      'Customer',
      'Telepon',
      'Tujuan',
      'Dibuat',
      'Status',
      'Surat Jalan',
      'Pemasukan',
      'Uang Jalan',
      'Insentif Kru',
      'BBM',
      'Tol',
      'Parkir',
      'Inap',
      'Lain-lain',
      'Total Keluar',
      'Keuntungan',
    ];
    const moneyFormat = '#,##0.00';
    const border = {
      top: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
    };
    const dateRangeText = `${this.formatDateOnly(context.filter.created_from)} s/d ${this.formatDateOnly(this.getInclusiveEndDate(context.filter.created_to_before))}`;
    const generatedAt = new Date();

    const titleRow = worksheet.addRow(['REKAP RESERVASI']);
    worksheet.mergeCells('A1:R1');
    titleRow.height = 24;
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.commit();

    const periodRow = worksheet.addRow([`Periode: ${dateRangeText}`]);
    worksheet.mergeCells('A2:R2');
    periodRow.getCell(1).font = { bold: true, color: { argb: 'FF1F2937' } };
    periodRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF3F8' } };
    periodRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    periodRow.commit();

    const generatedRow = worksheet.addRow([`Dibuat: ${this.formatDateTime(generatedAt)} | Filter bulan/tahun: ${filters.month}/${filters.year}`]);
    worksheet.mergeCells('A3:R3');
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
    let totalIncome = 0;
    let totalExpense = 0;
    let totalProfit = 0;

    while (true) {
      const batch = await this.orderService.findRecapOrdersBatch(context, this.batchSize, cursorId);

      if (!batch.length)
        break;

      for (const order of batch) {
        const row = this.orderService.buildRecapRow(order);
        const income = this.toNumber(row.income);
        const totalExpenseRow = this.toNumber(row.total_expense);
        const profit = this.toNumber(row.profit);

        const dataRow = worksheet.addRow({
          no: rowNo,
          order_number: row.order_number,
          customer_name: row.customer_name ?? '',
          customer_phone: row.customer_phone ?? '',
          destination: row.destination ?? '',
          created_at: row.created_at,
          status: row.status ?? '',
          trip_sheet_count: row.trip_sheet_count,
          income,
          driver_allowance: this.toNumber(row.driver_allowance),
          expense_crew: this.toNumber(row.expense_crew),
          expense_fuel: this.toNumber(row.expense_fuel),
          expense_toll: this.toNumber(row.expense_toll),
          expense_parking: this.toNumber(row.expense_parking),
          expense_stay: this.toNumber(row.expense_stay),
          expense_others: this.toNumber(row.expense_others),
          total_expense: totalExpenseRow,
          profit,
        });

        dataRow.eachCell((cell, colNumber) => {
          cell.border = border;
          cell.alignment = {
            horizontal: colNumber === 1 || colNumber === 7 || colNumber === 8
              ? 'center'
              : (colNumber >= 9 ? 'right' : 'left'),
            vertical: 'middle',
            wrapText: colNumber === 5,
          };
        });
        dataRow.getCell(6).numFmt = 'dd/mm/yyyy hh:mm';
        for (let col = 9; col <= 18; col += 1)
          dataRow.getCell(col).numFmt = moneyFormat;

        if (rowNo % 2 === 0) {
          dataRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
        }

        dataRow.commit();

        totalIncome += income;
        totalExpense += totalExpenseRow;
        totalProfit += profit;
        cursorId = order.id;
        rowNo += 1;
      }

      if (batch.length < this.batchSize)
        break;
    }

    worksheet.addRow([]).commit();
    const summaryTitle = worksheet.addRow(['RINGKASAN']);
    worksheet.mergeCells(`A${summaryTitle.number}:D${summaryTitle.number}`);
    summaryTitle.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summaryTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    summaryTitle.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    summaryTitle.commit();

    [
      ['Total Reservasi', rowNo - 1],
      ['Total Pemasukan', totalIncome],
      ['Total Pengeluaran', totalExpense],
      ['Total Keuntungan', totalProfit],
      ['Periode', dateRangeText],
    ].forEach(([label, value], index) => {
      const summaryRow = worksheet.addRow([label, value]);
      summaryRow.getCell(1).font = { bold: true };
      summaryRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF3F8' } };
      summaryRow.getCell(2).alignment = { horizontal: typeof value === 'number' ? 'right' : 'left' };
      summaryRow.eachCell((cell) => {
        cell.border = border;
      });

      if (index >= 1 && index <= 3)
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
        module_name: ORDER_RECAP_EXPORT_MODULE,
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

  private normalizeFilters(dto: CreateOrderRecapExportDto): OrderRecapExportFilters {
    return {
      month: Number(dto.month),
      year: Number(dto.year),
      ...(dto.date_from ? { date_from: dto.date_from } : {}),
      ...(dto.date_to ? { date_to: dto.date_to } : {}),
    };
  }

  private parseStoredFilters(filters: unknown): OrderRecapExportFilters {
    if (!filters || typeof filters !== 'object') {
      throw new BadRequestException({
        success: false,
        message: 'Filter export tidak valid.',
      });
    }

    const raw = filters as Record<string, unknown>;

    return this.normalizeFilters({
      month: Number(raw.month),
      year: Number(raw.year),
      ...(typeof raw.date_from === 'string' ? { date_from: raw.date_from } : {}),
      ...(typeof raw.date_to === 'string' ? { date_to: raw.date_to } : {}),
    });
  }

  private serializeJob(exportJob: Awaited<ReturnType<OrderRecapExportService['findOwnedJob']>>) {
    const id = exportJob.id.toString();
    const completed = exportJob.status === ExportJobStatus.COMPLETED && Boolean(exportJob.file_path);

    return {
      id,
      jobId: id,
      status: this.toApiStatus(exportJob.status),
      fileName: exportJob.file_name,
      downloadUrl: completed ? `/order-recap/export/${id}/download` : null,
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
    context: ReturnType<OrderService['buildRecapQueryContext']>,
  ) {
    const start = context.filter.created_from.slice(0, 10);
    const end = new Date(context.filter.created_to_before);
    end.setUTCDate(end.getUTCDate() - 1);

    return `order-recap-export-${start}-to-${end.toISOString().slice(0, 10)}-${exportJobId.toString()}.xlsx`;
  }

  private buildStoredFilePath(fileName: string) {
    return ['exports', 'order-recap', fileName].join('/');
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
    return join(resolveUploadRoot(), 'exports', 'order-recap');
  }

  private async cleanupOldExports() {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - this.cleanupAfterDays);

    try {
      const jobs = await this.prisma.db.exportJob.findMany({
        where: {
          module_name: ORDER_RECAP_EXPORT_MODULE,
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
      console.error('[OrderRecapExportService] Failed to cleanup export files', error);
    }
  }
}
