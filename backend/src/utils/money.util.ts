import { Prisma } from 'generated/prisma/client';

/** Cocok dengan PostgreSQL DECIMAL(15,2): non-negatif, hingga 13 digit bulat + 2 desimal. */
export const MONEY_DECIMAL_REGEX = /^\d{1,13}(\.\d{1,2})?$/;

export const MONEY_DECIMAL_MESSAGE =
  'Nilai uang harus string desimal non-negatif, paling banyak 13 digit di bagian bulat dan 2 digit desimal (DECIMAL 15,2)';

export function toPrismaDecimal(
  value: string | null | undefined,
): Prisma.Decimal | null | undefined {
  if (value === undefined)
    return undefined;
  if (value === null || value === '')
    return null;
  return new Prisma.Decimal(value);
}

export function decimalToMoneyString(value: unknown): string | null {
  if (value === null || value === undefined)
    return null;
  try {
    return new Prisma.Decimal(value as string | number | Prisma.Decimal).toFixed(2);
  }
  catch {
    return null;
  }
}
