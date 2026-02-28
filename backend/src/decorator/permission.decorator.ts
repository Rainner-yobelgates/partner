import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

export const Permission = (resource: string, action: string) =>
  SetMetadata(PERMISSION_KEY, { resource, action });