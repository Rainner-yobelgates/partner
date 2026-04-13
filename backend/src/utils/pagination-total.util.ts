/** Prisma `count()` dalam `$transaction` sering bertipe bigint; JSON & Math.ceil butuh number. */
export function normalizePrismaCount(total: number | bigint): number {
  return typeof total === 'bigint' ? Number(total) : total
}
