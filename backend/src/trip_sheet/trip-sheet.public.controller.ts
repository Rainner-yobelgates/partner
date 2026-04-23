import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { TripSheetService } from './trip-sheet.service';
import { UpdateTripSheetPublicDto } from './dto/trip-sheet.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';
import { resolveUploadRoot } from 'src/utils/upload-path.util';
import { Status } from 'generated/prisma/enums';

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

const imageFileFilter = (_req: Request,
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

@ApiTags('Trip Sheets Public')
@Controller('trip-sheets/public')
export class TripSheetPublicController {
  constructor(private readonly tripSheetService: TripSheetService) {}

  @Get(':uuid')
  @ApiOperation({
    summary: 'Ambil surat jalan (public) by UUID',
    description: 'Endpoint publik untuk driver mengisi surat jalan.',
  })
  @ApiParam({ name: 'uuid', description: 'UUID surat jalan', example: '550e8400-e29b-41d4-a716-446655440000' })
  findPublic(@Param('uuid') uuid: string) {
    return this.tripSheetService.findPublic(uuid);
  }

  @Put(':uuid')
  @ApiOperation({
    summary: 'Update surat jalan (public) by UUID',
    description: 'Endpoint publik untuk update input surat jalan oleh driver. Link publik hanya bisa diisi satu kali.',
  })
  @ApiParam({ name: 'uuid', description: 'UUID surat jalan', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
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
  updatePublic(
    @Param('uuid') uuid: string,
    @UploadedFiles() files: UploadedFile[],
    @Req() req: Request,
    @Body() dto: UpdateTripSheetPublicDto,
  ) {
    if (files?.length)
      dto.attachment = buildAttachmentValue(req, files, dto.attachment);

    return this.tripSheetService.updatePublic(uuid, dto);
  }
}








