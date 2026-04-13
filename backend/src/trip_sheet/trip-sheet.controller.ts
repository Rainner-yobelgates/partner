import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { UpdateTripSheetDto, QueryTripSheetDto } from './dto/trip-sheet.dto';
import { TripSheetService } from './trip-sheet.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { Permission } from 'src/decorator/permission.decorator';
import { PermissionGuard } from 'src/guard/permission.guard';
import { CurrentUser, CurrentUserType } from 'src/decorator/current-user.decorator';
import { Status } from 'generated/prisma/enums';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';
import { resolveUploadRoot } from 'src/utils/upload-path.util';

const tripSheetUploadDir = join(resolveUploadRoot(), 'trip-sheets');
const maxTripSheetFiles = 15;
const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/tiff',
]);

type UploadedFile = {
  filename: string;
  mimetype: string;
  originalname: string;
};

const ensureTripSheetDir = () => {
  if (!existsSync(tripSheetUploadDir))
    mkdirSync(tripSheetUploadDir, { recursive: true });
};

const imageFileFilter = (
  _req: Request,
  file: UploadedFile,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (allowedImageTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new BadRequestException('Hanya file gambar yang diperbolehkan.'), false);
};

const tripSheetStorage = diskStorage({
  destination: (_req, _file, cb) => {
    ensureTripSheetDir();
    cb(null, tripSheetUploadDir);
  },
  filename: (_req, file, cb) => {
    const safeExt = extname(file.originalname || '');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${safeExt}`);
  },
});

const parseAttachmentList = (value?: string) => {
  if (!value)
    return [];

  const trimmed = value.trim();
  if (!trimmed)
    return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed))
      return parsed.filter((item) => typeof item === 'string' && item.trim());
  }
  catch {
    return [trimmed];
  }

  return [trimmed];
};

const buildAttachmentValue = (req: Request, files: UploadedFile[], existing?: string) => {
  const base = req.get('host') ? `${req.protocol}://${req.get('host')}` : '';
  const uploaded = files.map((file) => `${base}/uploads/trip-sheets/${file.filename}`);
  const existingList = parseAttachmentList(existing);
  const merged = [...existingList, ...uploaded].filter((item) => item && item.trim());

  if (!merged.length)
    return undefined;

  return JSON.stringify(merged);
};

@ApiTags('Trip Sheets')
@Controller('trip-sheets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TripSheetController {
  constructor(private readonly tripSheetService: TripSheetService) {}

  @Get()
  @Permission('trip_sheet', 'read')
  @ApiOperation({
    summary: 'Ambil semua data trip sheet',
    description:
      'Menampilkan daftar trip sheet dengan pagination, search, filter, dan sorting.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Halaman saat ini' })
  @ApiQuery({ name: 'perPage', required: false, example: '10', description: 'Jumlah data per halaman' })
  @ApiQuery({ name: 'search', required: false, example: 'Bandara', description: 'Cari berdasarkan destination / expense_notes' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at', description: 'Field untuk sorting' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc', description: 'Arah sorting' })
  @ApiQuery({ name: 'status', required: false, enum: Object.values(Status), description: 'Filter berdasarkan status' })
  @ApiQuery({ name: 'order_id', required: false, example: '1', description: 'Filter berdasarkan ID order' })
  @ApiQuery({ name: 'driver_id', required: false, example: '10', description: 'Filter berdasarkan ID driver' })
  @ApiQuery({ name: 'date_from', required: false, example: '2025-04-01T00:00:00.000Z', description: 'Filter dari tanggal' })
  @ApiQuery({ name: 'date_to', required: false, example: '2025-04-30T23:59:59.999Z', description: 'Filter sampai tanggal' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query() query: QueryTripSheetDto) {
    return this.tripSheetService.findAll(query);
  }

  @Get(':uuid')
  @Permission('trip_sheet', 'detail')
  @ApiOperation({
    summary: 'Ambil detail trip sheet by UUID',
    description: 'Menampilkan detail satu trip sheet berdasarkan trip_sheets_uuid.',
  })
  @ApiParam({ name: 'uuid', description: 'UUID trip sheet (trip_sheets_uuid)', example: '550e8400-e29b-41d4-a716-446655440000' })
  findOne(@Param('uuid') uuid: string) {
    return this.tripSheetService.findOne(uuid);
  }

  @Put(':id')
  @Permission('trip_sheet', 'update')
  @ApiOperation({
    summary: 'Update trip sheet by ID',
    description: 'Memperbarui data trip sheet berdasarkan id. Semua field bersifat opsional.',
  })
  @ApiParam({ name: 'id', description: 'ID trip sheet (integer)', example: 1 })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        order_vehicle_id: { type: 'string', example: '1' },
        driver_id: { type: 'string', example: '10' },
        assistant_id: { type: 'string', example: '11' },
        fuel_cost: { type: 'string', example: '150000.00', description: 'DECIMAL 15,2' },
        toll_fee: { type: 'string', example: '45000.00', description: 'DECIMAL 15,2' },
        parking_fee: { type: 'string', example: '20000.00', description: 'DECIMAL 15,2' },
        stay_cost: { type: 'string', example: '120000.00', description: 'DECIMAL 15,2' },
        expense_notes: { type: 'string', example: 'BBM Pertamax + tol lingkar luar' },
        status: { type: 'string', enum: Object.values(Status) },
        attachment: { type: 'string', example: '["https://files.example.com/bukti.jpg"]' },
        attachments: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('attachments', maxTripSheetFiles, {
      storage: tripSheetStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  update(
    @Param('id') id: number,
    @UploadedFiles() files: UploadedFile[],
    @Req() req: Request,
    @Body() dto: UpdateTripSheetDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    if (files?.length)
      dto.attachment = buildAttachmentValue(req, files, dto.attachment);

    return this.tripSheetService.update(id, dto, user);
  }
}








