import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';

export function throwServiceError(
  error: unknown,
  message = 'Operation failed',
): never {
  if (error instanceof HttpException)
    throw error;

  if (Array.isArray(error)) {
    throw new BadRequestException({
      success: false,
      message: 'Validation failed',
      errors: error,
    });
  }

  if (error instanceof Error) {
    throw new InternalServerErrorException({
      success: false,
      message,
      error: error.message,
    });
  }

  throw new InternalServerErrorException({
    success: false,
    message,
    error: 'Unknown error',
  });
}
