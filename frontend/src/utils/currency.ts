function formatRupiahNumber(value?: string | number | null): string {
  if (value == null || value === '')
    return '-'

  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n))
    return String(value)

  const isWhole = Math.abs(n - Math.trunc(n)) < 1e-9
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatRupiah(value?: string | number | null): string {
  const formatted = formatRupiahNumber(value)
  return formatted === '-' ? formatted : `Rp. ${formatted}`
}

export function formatRupiahPlain(value?: string | number | null): string {
  return formatRupiahNumber(value)
}
