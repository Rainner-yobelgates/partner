import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { MONEY_DECIMAL_MESSAGE, MONEY_DECIMAL_REGEX } from './money.util';

function trimMoneyTransform({ value }: { value: unknown }) {
  if (value === '' || value === null)
    return undefined;
  return typeof value === 'string' ? value.trim() : value;
}

export function IsMoneyAmountOptional(description: string, example = '1500000.50') {
  return applyDecorators(
    ApiPropertyOptional({
      description: `${description} (string, DECIMAL 15,2)`,
      example,
      type: String,
    }),
    IsOptional(),
    Transform(trimMoneyTransform),
    IsString({ message: 'Nilai uang harus berupa string' }),
    Matches(MONEY_DECIMAL_REGEX, { message: MONEY_DECIMAL_MESSAGE }),
  );
}

export function IsMoneyAmountRequired(description: string, example = '50000.00') {
  return applyDecorators(
    ApiProperty({
      description: `${description} (string, DECIMAL 15,2)`,
      example,
      type: String,
    }),
    IsNotEmpty(),
    Transform(trimMoneyTransform),
    IsString({ message: 'Nilai uang harus berupa string' }),
    Matches(MONEY_DECIMAL_REGEX, { message: MONEY_DECIMAL_MESSAGE }),
  );
}
