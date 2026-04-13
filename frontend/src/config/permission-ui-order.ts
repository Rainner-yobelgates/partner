/**
 * Judul grup permission (Bahasa Indonesia) — selaras label menu `NavItems.vue`.
 */
export const PERMISSION_RESOURCE_LABELS: Record<string, string> = {
  driver: 'Pengemudi',
  vehicle: 'Kendaraan',
  facility: 'Fasilitas',
  route: 'Rute',
  'vehicle-service': 'Pemeliharaan Kendaraan',
  client: 'Client',
  contract: 'Kontrak',
  'client-recap': 'Rekap Klien',
  order: 'Pesanan',
  'order-recap': 'Rekap Pesanan',
  trip_sheet: 'Trip Sheet',
  shuttle: 'Antar Jemput',
  user: 'Pengguna',
  role: 'Peran',
}

export function permissionResourceTitle(resource: string): string {
  const known = PERMISSION_RESOURCE_LABELS[resource]
  if (known)
    return known
  return resource
    .split(/[-_]/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** Label aksi untuk tabel (Bahasa Indonesia). */
const PERMISSION_ACTION_LABELS: Record<string, string> = {
  read: 'Lihat',
  create: 'Buat',
  update: 'Ubah',
  delete: 'Hapus',
  detail: 'Detail',
}

export function permissionActionTitle(action: string): string {
  return PERMISSION_ACTION_LABELS[action] ?? action
}

/**
 * Urutan resource di halaman Hak Akses Peran — mengikuti grup sidebar `NavItems.vue`.
 * Resource yang tidak ada di daftar tampil di bawah, diurut alfabetis.
 */
export const PERMISSION_RESOURCE_ORDER = [
  'driver',
  'vehicle',
  'facility',
  'route',
  'vehicle-service',
  'client',
  'contract',
  'shuttle',
  'client-recap',
  'order',
  'order-recap',
  'trip_sheet',
  'user',
  'role',
] as const

/** `read` selalu di atas; sisanya alfabetis. */
export function comparePermissionActions(a: string, b: string): number {
  if (a === 'read')
    return b === 'read' ? 0 : -1
  if (b === 'read')
    return 1
  return a.localeCompare(b)
}

export function permissionResourceSortIndex(resource: string): number {
  const order = PERMISSION_RESOURCE_ORDER as readonly string[]
  const i = order.indexOf(resource)
  return i === -1 ? order.length : i
}

