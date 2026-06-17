<script setup lang="ts">
import { ApiError } from '@/services/http'
import { orderService, type OrderRecapExportJob, type OrderRecapRow, type OrderRecapSummary } from '@/services/orders'
import { useAuthStore } from '@/stores/auth'
import { formatRupiah, formatRupiahPlain } from '@/utils/currency'

const authStore = useAuthStore()
const canRead = computed(() => authStore.hasPermission('order-recap:read'))
const canExport = computed(() => authStore.hasPermission('order-recap:read'))

const now = new Date()
const month = ref(now.getMonth() + 1)
const year = ref(now.getFullYear())
const startDate = ref('')
const endDate = ref('')

const isLoading = ref(false)
const rows = ref<OrderRecapRow[]>([])
const summary = ref<OrderRecapSummary | null>(null)
const filterMeta = ref<{ created_from: string; created_to_before: string } | null>(null)
const isDetailDialogOpen = ref(false)
const detailRow = ref<OrderRecapRow | null>(null)
const isExportSubmitting = ref(false)
const isExportDownloading = ref(false)
const activeExport = ref<OrderRecapExportJob | null>(null)
let exportPollTimer: number | undefined

const snackbar = ref<{ show: boolean; color: 'success' | 'error'; text: string }>({ show: false, color: 'success', text: '' })

const monthItems = [
  { title: 'Januari', value: 1 },
  { title: 'Februari', value: 2 },
  { title: 'Maret', value: 3 },
  { title: 'April', value: 4 },
  { title: 'Mei', value: 5 },
  { title: 'Juni', value: 6 },
  { title: 'Juli', value: 7 },
  { title: 'Agustus', value: 8 },
  { title: 'September', value: 9 },
  { title: 'Oktober', value: 10 },
  { title: 'November', value: 11 },
  { title: 'Desember', value: 12 },
]

const yearItems = computed(() => {
  const y = now.getFullYear()
  const list: { title: string; value: number }[] = []
  for (let i = y - 3; i <= y + 1; i++)
    list.push({ title: String(i), value: i })
  return list
})

const showToast = (text: string, color: 'success' | 'error' = 'success') => {
  snackbar.value = { show: true, color, text }
}

const getErrorMessage = (error: unknown) => {
  if (!(error instanceof ApiError))
    return 'Terjadi kesalahan. Silakan coba lagi.'
  const detail = typeof error.payload?.error === 'string' ? error.payload.error.trim() : ''
  if (detail && error.message === 'Operation failed')
    return `${error.message}: ${detail}`
  return error.message
}

const isExportRunning = computed(() =>
  activeExport.value?.status === 'pending' || activeExport.value?.status === 'processing',
)

const exportAlertType = computed(() => {
  if (activeExport.value?.status === 'completed')
    return 'success'

  if (activeExport.value?.status === 'failed')
    return 'error'

  return 'info'
})

const exportStatusText = computed(() => {
  const current = activeExport.value
  if (!current)
    return ''

  if (current.status === 'completed')
    return 'Export selesai. File Excel siap diunduh.'

  if (current.status === 'failed')
    return current.errorMessage || 'Export gagal diproses.'

  return 'Export sedang diproses. File akan tersedia setelah selesai.'
})

const formatMoneyId = (value?: string | null) => {
  return formatRupiah(value)
}
const formatMoneyTable = (value?: string | null) => formatRupiahPlain(value)

const formatDate = (value?: string | null) => {
  if (!value)
    return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

const formatDateOnly = (value?: string | null) => {
  if (!value)
    return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

const formatRecapPeriod = (row?: OrderRecapRow | null) => {
  if (!row)
    return '-'

  const start = row.start_date || row.usage_date || null
  const finish = row.finish_date || row.usage_date || null

  if (!start && !finish)
    return '-'

  if (start && finish)
    return `${formatDateOnly(start)} - ${formatDateOnly(finish)}`

  return formatDateOnly(start || finish)
}

type RecapVehicleUnit = NonNullable<OrderRecapRow['vehicle_units']>[number]

const getRecapVehicleLabel = (unit: RecapVehicleUnit) => {
  const label = [
    unit.plate_number,
    unit.vehicle_type,
  ].filter(Boolean).join(' - ')

  return label || (unit.id ? `Kendaraan #${unit.id}` : '-')
}

const getRecapVehicleUnits = (row?: OrderRecapRow | null) => row?.vehicle_units ?? []
const getVisibleRecapVehicleUnits = (row?: OrderRecapRow | null) => getRecapVehicleUnits(row).slice(0, 2)
const getHiddenRecapVehicleCount = (row?: OrderRecapRow | null) => Math.max(getRecapVehicleUnits(row).length - 2, 0)

const profitClass = (value?: string | null) => {
  if (value == null || value === '')
    return ''
  const n = Number(value)
  if (!Number.isFinite(n))
    return ''
  if (n < 0)
    return 'text-error font-weight-medium'
  if (n > 0)
    return 'text-success font-weight-medium'
  return ''
}

const openDetailDialog = (row: OrderRecapRow) => {
  detailRow.value = row
  isDetailDialogOpen.value = true
}

const buildRecapExportPayload = () => ({
  month: month.value,
  year: year.value,
  ...(startDate.value ? { date_from: startDate.value } : {}),
  ...(endDate.value ? { date_to: endDate.value } : {}),
})

const stopExportPolling = () => {
  if (exportPollTimer !== undefined) {
    window.clearInterval(exportPollTimer)
    exportPollTimer = undefined
  }
}

const pollExportStatus = async (jobId: string) => {
  try {
    const response = await orderService.recapExportStatus(jobId)
    activeExport.value = response.data

    if (response.data.status === 'completed') {
      stopExportPolling()
      showToast('Export selesai. File Excel siap diunduh.')
    }
    else if (response.data.status === 'failed') {
      stopExportPolling()
      showToast(response.data.errorMessage || 'Export gagal diproses.', 'error')
    }
  }
  catch (error) {
    console.error('[pages/order-recap.vue]', error)
    stopExportPolling()
    showToast(getErrorMessage(error), 'error')
  }
}

const startExportPolling = (jobId: string) => {
  stopExportPolling()
  void pollExportStatus(jobId)
  exportPollTimer = window.setInterval(() => {
    void pollExportStatus(jobId)
  }, 3000)
}

const submitExport = async () => {
  if (!canExport.value || isExportSubmitting.value || isExportRunning.value)
    return

  isExportSubmitting.value = true

  try {
    const response = await orderService.requestRecapExport(buildRecapExportPayload())
    activeExport.value = {
      id: response.data.jobId,
      jobId: response.data.jobId,
      status: response.data.status,
    }
    showToast('Export sedang diproses. File akan tersedia setelah selesai.')
    startExportPolling(response.data.jobId)
  }
  catch (error) {
    console.error('[pages/order-recap.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isExportSubmitting.value = false
  }
}

const getDownloadFileName = (contentDisposition?: string | null) => {
  if (!contentDisposition)
    return activeExport.value?.fileName || 'order-recap-export.xlsx'

  const encoded = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (encoded?.[1])
    return decodeURIComponent(encoded[1])

  const plain = contentDisposition.match(/filename="?([^"]+)"?/i)
  return plain?.[1] || activeExport.value?.fileName || 'order-recap-export.xlsx'
}

const downloadExportFile = async () => {
  if (!activeExport.value || activeExport.value.status !== 'completed')
    return

  isExportDownloading.value = true

  try {
    const response = await orderService.downloadRecapExport(activeExport.value.jobId)
    const url = window.URL.createObjectURL(response.data)
    const link = document.createElement('a')

    link.href = url
    link.download = getDownloadFileName(String(response.headers['content-disposition'] ?? ''))
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }
  catch (error) {
    console.error('[pages/order-recap.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isExportDownloading.value = false
  }
}

const fetchRecap = async () => {
  if (!canRead.value)
    return

  isLoading.value = true
  try {
    const res = await orderService.recap(
      month.value,
      year.value,
      startDate.value || undefined,
      endDate.value || undefined,
    )
    rows.value = res.data
    summary.value = res.summary
    filterMeta.value = { created_from: res.filter.created_from, created_to_before: res.filter.created_to_before }
  }
  catch (error) {
    console.error('[pages/order-recap.vue]', error)
    showToast(getErrorMessage(error), 'error')
    rows.value = []
    summary.value = null
    filterMeta.value = null
  }
  finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (canRead.value)
    fetchRecap()
})

onBeforeUnmount(stopExportPolling)
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <span class="text-h6">Rekap Reservasi</span>
          <VBtn
            v-if="canExport"
            color="primary"
            prepend-icon="ri-file-excel-2-line"
            :loading="isExportSubmitting"
            :disabled="isExportSubmitting || isExportRunning"
            @click="submitExport"
          >
            Export Excel
          </VBtn>
        </div>
      </template>
      <template #subtitle>
        <span class="text-body-2 text-medium-emphasis">
        </span>
      </template>
    </VCardItem>

    <VCardText>
      <VRow align="end">
        <VCol cols="12" sm="6" md="2">
          <VSelect
            v-model="month"
            label="Bulan"
            :items="monthItems"
            item-title="title"
            item-value="value"
          />
        </VCol>
        <VCol cols="12" sm="6" md="2">
          <VSelect
            v-model="year"
            label="Tahun"
            :items="yearItems"
            item-title="title"
            item-value="value"
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VTextField
            v-model="startDate"
            label="Start Date"
            type="date"
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VTextField
            v-model="endDate"
            label="End Date"
            type="date"
          />
        </VCol>
        <VCol cols="12" sm="12" md="2">
          <VBtn color="primary" block class="mt-1" :loading="isLoading" @click="fetchRecap">
            Terapkan
          </VBtn>
        </VCol>
      </VRow>
      <p v-if="filterMeta" class="text-caption text-medium-emphasis mt-2 mb-0">
        Rentang: {{ filterMeta.created_from }} - sebelum {{ filterMeta.created_to_before }}
      </p>
      <VAlert
        v-if="activeExport"
        class="mt-4"
        :type="exportAlertType"
        variant="tonal"
      >
        <div class="d-flex align-center justify-space-between flex-wrap gap-3">
          <div>
            <div class="font-weight-medium">{{ exportStatusText }}</div>
          </div>
          <VBtn
            v-if="activeExport.status === 'completed'"
            color="primary"
            variant="flat"
            :loading="isExportDownloading"
            :disabled="isExportDownloading"
            @click="downloadExportFile"
          >
            Download Excel
          </VBtn>
        </div>
      </VAlert>
    </VCardText>

    <VDivider />

    <VCardText v-if="summary">
      <VRow>
        <VCol cols="12" md="4">
          <div class="text-caption text-medium-emphasis">Total pemasukan ({{ summary.order_count }} reservasi)</div>
          <div class="text-h6">{{ formatMoneyId(summary.total_income) }}</div>
        </VCol>
        <VCol cols="12" md="4">
          <div class="text-caption text-medium-emphasis">Total pengeluaran surat jalan</div>
          <div class="text-h6">{{ formatMoneyId(summary.total_expense) }}</div>
        </VCol>
        <VCol cols="12" md="4">
          <div class="text-caption text-medium-emphasis">Total keuntungan / selisih</div>
          <div class="text-h6" :class="profitClass(summary.total_profit)">{{ formatMoneyId(summary.total_profit) }}</div>
        </VCol>
      </VRow>
    </VCardText>

    <VDivider />

    <VCardText>
      <VProgressLinear v-if="isLoading" indeterminate color="primary" class="mb-4" />
      <div class="overflow-x-auto">
        <VTable density="compact" class="text-no-wrap">
          <thead>
            <tr>
              <th>No. Reservasi</th>
              <th>Customer</th>
              <th>Telepon</th>
              <th>Start - Finish</th>
              <th>Unit Kendaraan</th>
              <th>Tujuan</th>
              <th>Dibuat</th>
              <th>Status</th>
              <th class="text-end">Surat Jalan</th>
              <th class="text-end">Pemasukan</th>
              <th class="text-end">Uang Jalan</th>
              <th class="text-end">Insentif Kru</th>
              <th class="text-end">BBM</th>
              <th class="text-end">Tol</th>
              <th class="text-end">Parkir</th>
              <th class="text-end">Inap</th>
              <th class="text-end">Lain-lain</th>
              <th class="text-end">Total keluar</th>
              <th class="text-end">Sisa Uang Jalan</th>
              <th class="text-end">Keuntungan</th>
              <th class="text-end">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!isLoading && rows.length === 0">
              <td colspan="21" class="text-center text-medium-emphasis py-8">
                Tidak ada reservasi pada periode ini.
              </td>
            </tr>
            <tr v-for="row in rows" :key="row.id">
              <td class="font-weight-medium">{{ row.order_number }}</td>
              <td>{{ row.customer_name || '-' }}</td>
              <td>{{ row.customer_phone || '-' }}</td>
              <td>{{ formatRecapPeriod(row) }}</td>
              <td class="vehicle-unit-cell">
                <div v-if="getRecapVehicleUnits(row).length" class="d-flex flex-column align-start gap-1">
                  <VChip
                    v-for="unit in getVisibleRecapVehicleUnits(row)"
                    :key="unit.id || getRecapVehicleLabel(unit)"
                    size="x-small"
                    color="secondary"
                    variant="tonal"
                    label
                    class="vehicle-unit-chip"
                    :title="getRecapVehicleLabel(unit)"
                  >
                    {{ getRecapVehicleLabel(unit) }}
                  </VChip>
                  <span v-if="getHiddenRecapVehicleCount(row)" class="text-caption text-medium-emphasis">
                    +{{ getHiddenRecapVehicleCount(row) }} kendaraan lagi
                  </span>
                </div>
                <span v-else>-</span>
              </td>
              <td>{{ row.destination || '-' }}</td>
              <td>{{ formatDate(row.created_at) }}</td>
              <td>
                <VChip
                  size="x-small"
                  :color="row.status === 'CONFIRMED' ? 'success' : row.status === 'CANCELLED' ? 'error' : 'warning'"
                  label
                >
                  {{ row.status || '-' }}
                </VChip>
              </td>
              <td class="text-end">{{ row.trip_sheet_count }}</td>
              <td class="text-end">{{ formatMoneyTable(row.income) }}</td>
              <td class="text-end">{{ formatMoneyTable(row.driver_allowance) }}</td>
              <td class="text-end">{{ formatMoneyTable(row.expense_crew) }}</td>
              <td class="text-end">{{ formatMoneyTable(row.expense_fuel) }}</td>
              <td class="text-end">{{ formatMoneyTable(row.expense_toll) }}</td>
              <td class="text-end">{{ formatMoneyTable(row.expense_parking) }}</td>
              <td class="text-end">{{ formatMoneyTable(row.expense_stay) }}</td>
              <td class="text-end">{{ formatMoneyTable(row.expense_others) }}</td>
              <td class="text-end">{{ formatMoneyTable(row.total_expense) }}</td>
              <td class="text-end" :class="profitClass(row.allowance_balance)">{{ formatMoneyTable(row.allowance_balance) }}</td>
              <td class="text-end" :class="profitClass(row.profit)">{{ formatMoneyTable(row.profit) }}</td>
              <td class="text-end">
                <VBtn size="small" variant="text" color="secondary" @click="openDetailDialog(row)">Detail</VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </VCardText>
  </VCard>

  <VDialog v-model="isDetailDialogOpen" max-width="840">
    <VCard>
      <VCardItem title="Detail Rekap Reservasi" />
      <VCardText>
        <VRow>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">No. Reservasi</div>
                <div class="text-body-1 font-weight-medium text-break">{{ detailRow?.order_number || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Customer</div>
                <div class="text-body-1 font-weight-medium text-break">{{ detailRow?.customer_name || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Telepon</div>
                <div class="text-body-1 font-weight-medium text-break">{{ detailRow?.customer_phone || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Start - Finish</div>
                <div class="text-body-1 font-weight-medium text-break">{{ formatRecapPeriod(detailRow) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Tujuan</div>
                <div class="text-body-1 font-weight-medium text-break">{{ detailRow?.destination || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Unit Kendaraan</div>
                <div v-if="getRecapVehicleUnits(detailRow).length" class="d-flex flex-column align-start gap-1">
                  <VChip
                    v-for="unit in getRecapVehicleUnits(detailRow)"
                    :key="unit.id || getRecapVehicleLabel(unit)"
                    size="x-small"
                    color="secondary"
                    variant="tonal"
                    label
                    class="vehicle-unit-chip"
                    :title="getRecapVehicleLabel(unit)"
                  >
                    {{ getRecapVehicleLabel(unit) }}
                  </VChip>
                </div>
                <div v-else class="text-body-1 font-weight-medium text-break">-</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Dibuat</div>
                <div class="text-body-1 font-weight-medium text-break">{{ formatDate(detailRow?.created_at) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Status</div>
                <div class="text-body-1 font-weight-medium text-break">{{ detailRow?.status || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Surat Jalan</div>
                <div class="text-body-1 font-weight-medium text-break">{{ detailRow?.trip_sheet_count ?? 0 }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Pemasukan</div>
                <div class="text-body-1 font-weight-medium text-break">{{ formatMoneyId(detailRow?.income) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Uang Jalan</div>
                <div class="text-body-1 font-weight-medium text-break">{{ formatMoneyId(detailRow?.driver_allowance) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Total Pengeluaran</div>
                <div class="text-body-1 font-weight-medium text-break">{{ formatMoneyId(detailRow?.total_expense) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Sisa Uang Jalan</div>
                <div class="text-body-1 font-weight-medium text-break" :class="profitClass(detailRow?.allowance_balance)">{{ formatMoneyId(detailRow?.allowance_balance) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Keuntungan / Selisih</div>
                <div class="text-body-1 font-weight-medium text-break" :class="profitClass(detailRow?.profit)">{{ formatMoneyId(detailRow?.profit) }}</div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isDetailDialogOpen = false">Tutup</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="2800">{{ snackbar.text }}</VSnackbar>
</template>

<style scoped>
.vehicle-unit-cell {
  min-width: 190px;
  max-width: 250px;
  white-space: normal;
}

.vehicle-unit-chip {
  max-width: 230px;
}

.vehicle-unit-chip :deep(.v-chip__content) {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
