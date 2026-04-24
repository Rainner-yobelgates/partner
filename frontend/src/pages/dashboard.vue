<script setup lang="ts">
import { useTheme } from 'vuetify'
import { ApiError } from '@/services/http'
import {
  dashboardService,
  type DashboardClientFinancial,
  type DashboardMasterSummary,
  type DashboardMonthlyFinancial,
  type DashboardOrderFinancial,
  type DashboardReportSummary,
  type DashboardTotalFinancial,
} from '@/services/dashboard'
import { clientMasterService, type ClientItem } from '@/services/masters'
import { useAuthStore } from '@/stores/auth'
import { formatRupiah, formatRupiahPlain } from '@/utils/currency'

const authStore = useAuthStore()
const vuetifyTheme = useTheme()

const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedClientId = ref<string | null>(null)

const clients = ref<ClientItem[]>([])
const masterSnapshot = ref<DashboardMasterSummary | null>(null)
const reportSummary = ref<DashboardReportSummary | null>(null)
const clientFinancial = ref<DashboardClientFinancial | null>(null)
const orderFinancial = ref<DashboardOrderFinancial | null>(null)
const totalFinancial = ref<DashboardTotalFinancial | null>(null)

const isLoading = ref(false)
const isInitialized = ref(false)

const snackbar = ref({ show: false, color: 'success' as const, text: '' })

const yearItems = computed(() => {
  const y = now.getFullYear()
  const result: { title: string; value: number }[] = []
  for (let i = y - 5; i <= y + 1; i += 1)
    result.push({ title: String(i), value: i })
  return result
})

const selectedClientName = computed(() => {
  if (!selectedClientId.value)
    return 'Semua Client'
  const found = clients.value.find(client => client.id === selectedClientId.value)
  return found?.name ?? 'Client'
})

const chartColors = computed(() => {
  const colors = vuetifyTheme.current.value.colors
  return [colors.success, colors.error, colors.primary]
})

const showToast = (text: string, color: 'success' | 'error' = 'success') => {
  snackbar.value = { show: true, color, text }
}

const toNumber = (value?: string | null) => {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

const formatMoneyId = (value?: string | number | null) => {
  return formatRupiah(value)
}
const formatMoneyTable = (value?: string | number | null) => formatRupiahPlain(value)

const formatCompactMoneyId = (value?: string | number | null) => {
  if (value == null || value === '')
    return '-'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n))
    return String(value)
  return `Rp. ${new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`
}

const getErrorMessage = (error: unknown) => {
  if (!(error instanceof ApiError))
    return 'Terjadi kesalahan. Silakan coba lagi.'
  const detail = typeof error.payload?.error === 'string' ? error.payload.error.trim() : ''
  if (detail && error.message === 'Operation failed')
    return `${error.message}: ${detail}`
  return error.message
}

const profitClass = (value?: string | null) => {
  const n = toNumber(value)
  if (n < 0)
    return 'text-error'
  if (n > 0)
    return 'text-success'
  return ''
}

const buildFinancialChartOptions = (rows: DashboardMonthlyFinancial[]) => ({
  chart: {
    toolbar: { show: false },
    parentHeightOffset: 0,
  },
  stroke: {
    width: [0, 0, 3],
    curve: 'smooth',
  },
  dataLabels: {
    enabled: false,
  },
  plotOptions: {
    bar: {
      columnWidth: '48%',
      borderRadius: 6,
    },
  },
  legend: {
    position: 'top',
    horizontalAlign: 'left',
  },
  colors: chartColors.value,
  xaxis: {
    categories: rows.map(row => row.label),
  },
  yaxis: {
    labels: {
      formatter: (value: number) => formatCompactMoneyId(value),
    },
  },
  tooltip: {
    shared: true,
    y: {
      formatter: (value: number) => formatMoneyId(value),
    },
  },
})

const clientChartSeries = computed(() => {
  const rows = clientFinancial.value?.monthly ?? []
  return [
    { name: 'Pendapatan', type: 'column', data: rows.map(row => toNumber(row.revenue)) },
    { name: 'Pengeluaran', type: 'column', data: rows.map(row => toNumber(row.expense)) },
    { name: 'Profit', type: 'line', data: rows.map(row => toNumber(row.profit)) },
  ]
})

const orderChartSeries = computed(() => {
  const rows = orderFinancial.value?.monthly ?? []
  return [
    { name: 'Pendapatan', type: 'column', data: rows.map(row => toNumber(row.revenue)) },
    { name: 'Pengeluaran', type: 'column', data: rows.map(row => toNumber(row.expense)) },
    { name: 'Profit', type: 'line', data: rows.map(row => toNumber(row.profit)) },
  ]
})

const clientChartOptions = computed(() => buildFinancialChartOptions(clientFinancial.value?.monthly ?? []))
const orderChartOptions = computed(() => buildFinancialChartOptions(orderFinancial.value?.monthly ?? []))
const totalChartOptions = computed(() => buildFinancialChartOptions(totalFinancial.value?.monthly ?? []))

const clientExpenseRows = computed(() => {
  const breakdown = clientFinancial.value?.expense_breakdown
  if (!breakdown)
    return []
  return [
    { label: 'Insentif Crew', value: breakdown.crew_incentive },
    { label: 'BBM', value: breakdown.fuel },
    { label: 'Tol', value: breakdown.toll_fee },
    { label: 'Lain-lain', value: breakdown.others },
    { label: 'Total Pengeluaran', value: breakdown.total },
  ]
})

const orderExpenseRows = computed(() => {
  const breakdown = orderFinancial.value?.expense_breakdown
  if (!breakdown)
    return []
  return [
    { label: 'BBM', value: breakdown.fuel_cost },
    { label: 'Tol', value: breakdown.toll_fee },
    { label: 'Parkir', value: breakdown.parking_fee },
    { label: 'Inap', value: breakdown.stay_cost },
    { label: 'Lain-lain', value: breakdown.others },
    { label: 'Total Pengeluaran', value: breakdown.total },
  ]
})

const totalChartSeries = computed(() => {
  const rows = totalFinancial.value?.monthly ?? []
  return [
    { name: 'Pendapatan', type: 'column', data: rows.map(row => toNumber(row.revenue)) },
    { name: 'Pengeluaran', type: 'column', data: rows.map(row => toNumber(row.expense)) },
    { name: 'Profit', type: 'line', data: rows.map(row => toNumber(row.profit)) },
  ]
})

const totalRevenueRows = computed(() => {
  const breakdown = totalFinancial.value?.revenue_breakdown
  if (!breakdown)
    return []
  return [
    { label: 'Pendapatan Kontrak', value: breakdown.contract },
    { label: 'Pendapatan Reservasi', value: breakdown.reservasi },
    { label: 'Total Pendapatan', value: breakdown.total },
  ]
})

const totalExpenseRows = computed(() => {
  const breakdown = totalFinancial.value?.expense_breakdown
  if (!breakdown)
    return []
  return [
    { label: 'Pengeluaran AJK / Antar Jemput Karyawan', value: breakdown.client_ajk },
    { label: 'Pengeluaran Reservasi', value: breakdown.reservasi },
    { label: 'Pengeluaran Layanan Service', value: breakdown.vehicle_service },
    { label: 'Pengeluaran Fasilitas', value: breakdown.facility },
    { label: 'Total Pengeluaran', value: breakdown.total },
  ]
})

let activeFetchToken = 0
const fetchDashboard = async () => {
  const fetchToken = ++activeFetchToken
  isLoading.value = true

  try {
    const response = await dashboardService.overview(selectedYear.value, selectedClientId.value)
    if (fetchToken !== activeFetchToken)
      return

    if (!masterSnapshot.value)
      masterSnapshot.value = response.data.master_summary

    reportSummary.value = response.data.report_summary
    clientFinancial.value = response.data.client_financial
    orderFinancial.value = response.data.order_financial
    totalFinancial.value = response.data.total_financial
  }
  catch (error) {
    if (fetchToken !== activeFetchToken)
      return
    console.error('[pages/dashboard.vue] fetchDashboard', error)
    showToast(getErrorMessage(error), 'error')
    reportSummary.value = null
    clientFinancial.value = null
    orderFinancial.value = null
    totalFinancial.value = null
  }
  finally {
    if (fetchToken === activeFetchToken)
      isLoading.value = false
  }
}

const loadClients = async () => {
  if (!authStore.hasPermission('client:read')) {
    clients.value = []
    return
  }

  try {
    const response = await clientMasterService.list({
      page: 1,
      perPage: 500,
      sortBy: 'name',
      sortOrder: 'asc',
    })
    clients.value = response.data
  }
  catch (error) {
    console.error('[pages/dashboard.vue] loadClients', error)
    clients.value = []
  }
}

const clearClientFilter = () => {
  selectedClientId.value = null
}

watch([selectedYear, selectedClientId], () => {
  if (!isInitialized.value)
    return
  fetchDashboard()
})

onMounted(async () => {
  await loadClients()
  await fetchDashboard()
  isInitialized.value = true
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem title="Summary Master Data" />
        <VCardText>
          <VRow>
            <VCol cols="12" sm="6" md="4" lg="2">
              <VSheet border rounded class="pa-4 h-100">
                <div class="text-caption text-medium-emphasis">Pengemudi</div>
                <div class="text-h5">{{ masterSnapshot?.driver_count ?? 0 }}</div>
              </VSheet>
            </VCol>
            <VCol cols="12" sm="6" md="4" lg="2">
              <VSheet border rounded class="pa-4 h-100">
                <div class="text-caption text-medium-emphasis">Kendaraan</div>
                <div class="text-h5">{{ masterSnapshot?.vehicle_count ?? 0 }}</div>
              </VSheet>
            </VCol>
            <VCol cols="12" sm="6" md="4" lg="2">
              <VSheet border rounded class="pa-4 h-100">
                <div class="text-caption text-medium-emphasis">Fasilitas</div>
                <div class="text-h5">{{ masterSnapshot?.facility_count ?? 0 }}</div>
              </VSheet>
            </VCol>
            <VCol cols="12" sm="6" md="4" lg="2">
              <VSheet border rounded class="pa-4 h-100">
                <div class="text-caption text-medium-emphasis">Rute</div>
                <div class="text-h5">{{ masterSnapshot?.route_count ?? 0 }}</div>
              </VSheet>
            </VCol>
            <VCol cols="12" sm="6" md="4" lg="4">
              <VSheet border rounded class="pa-4 h-100">
                <div class="text-caption text-medium-emphasis">Pemeliharaan Kendaraan</div>
                <div class="text-h5">{{ masterSnapshot?.vehicle_service_count ?? 0 }}</div>
              </VSheet>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" md="5">
      <VCard>
        <VCardItem title="Filter Tahun">
          <template #subtitle>
            <span class="text-body-2 text-medium-emphasis">
              Berlaku untuk Report Tahunan, Finansial Klien, Rekap Reservasi, dan Total Keuangan.
            </span>
          </template>
        </VCardItem>
        <VCardText>
          <VRow align="end">
            <VCol cols="12" sm="7">
              <VSelect
                v-model="selectedYear"
                label="Tahun"
                :items="yearItems"
                item-title="title"
                item-value="value"
              />
            </VCol>
            <VCol cols="12" sm="5">
              <VBtn color="primary" :loading="isLoading" block @click="fetchDashboard">
                Muat Ulang
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" md="7">
      <VCard>
        <VCardItem title="Filter Client (Khusus Klien)">
          <template #subtitle>
            <span class="text-body-2 text-medium-emphasis">
              Hanya memengaruhi Report Tahunan, Finansial Klien, dan porsi klien di Total Keuangan.
            </span>
          </template>
        </VCardItem>
        <VCardText>
          <VRow align="end">
            <VCol cols="12" sm="8">
              <VSelect
                v-model="selectedClientId"
                label="Client"
                :items="clients"
                item-title="name"
                item-value="id"
                clearable
              >
                <template #item="{ props: itemProps, item }">
                  <VListItem v-bind="itemProps" :title="item.raw.name" :subtitle="item.raw.code || undefined" />
                </template>
              </VSelect>
            </VCol>
            <VCol cols="12" sm="4">
              <VBtn color="secondary" variant="outlined" block @click="clearClientFilter">
                Reset Client
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12">
      <VCard>
        <VCardItem title="Report Tahunan">
          <template #subtitle>
            <span class="text-body-2 text-medium-emphasis">
              Tahun {{ selectedYear }} - {{ selectedClientName }}
            </span>
          </template>
        </VCardItem>
        <VCardText>
          <VProgressLinear v-if="isLoading" indeterminate color="primary" class="mb-4" />
          <VRow>
            <VCol cols="12" md="4">
              <VSheet border rounded class="pa-4">
                <div class="text-caption text-medium-emphasis">Jumlah Antar Jemput</div>
                <div class="text-h5">{{ reportSummary?.shuttle_count ?? 0 }}</div>
              </VSheet>
            </VCol>
            <VCol cols="12" md="4">
              <VSheet border rounded class="pa-4">
                <div class="text-caption text-medium-emphasis">Jumlah Client</div>
                <div class="text-h5">{{ reportSummary?.client_count ?? 0 }}</div>
              </VSheet>
            </VCol>
            <VCol cols="12" md="4">
              <VSheet border rounded class="pa-4">
                <div class="text-caption text-medium-emphasis">Jumlah Contract</div>
                <div class="text-h5">{{ reportSummary?.contract_count ?? 0 }}</div>
              </VSheet>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" xl="6">
      <VCard>
        <VCardItem title="Finansial AJK (Antar Jemput Karyawan)">
          <template #subtitle>
            <span class="text-body-2 text-medium-emphasis">
              Pendapatan dari kontrak, pengeluaran dari AJK / antar jemput karyawan.
            </span>
          </template>
        </VCardItem>
        <VCardText>
          <VRow class="mb-2">
            <VCol cols="12" md="4">
              <div class="text-caption text-medium-emphasis">Total Pendapatan</div>
              <div class="text-h6">{{ formatMoneyId(clientFinancial?.totals.total_revenue) }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-caption text-medium-emphasis">Total Pengeluaran</div>
              <div class="text-h6">{{ formatMoneyId(clientFinancial?.totals.total_expense) }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-caption text-medium-emphasis">Total Profit</div>
              <div class="text-h6" :class="profitClass(clientFinancial?.totals.total_profit || null)">
                {{ formatMoneyId(clientFinancial?.totals.total_profit) }}
              </div>
            </VCol>
          </VRow>

          <VueApexCharts
            type="line"
            height="300"
            :options="clientChartOptions"
            :series="clientChartSeries"
          />

          <VDivider class="my-4" />

          <div class="text-subtitle-2 mb-2">Breakdown Pengeluaran AJK / Antar Jemput Karyawan</div>
          <VTable density="compact">
            <tbody>
              <tr v-for="row in clientExpenseRows" :key="row.label">
                <td class="text-medium-emphasis">{{ row.label }}</td>
                <td class="text-end">{{ formatMoneyTable(row.value) }}</td>
              </tr>
            </tbody>
          </VTable>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" xl="6">
      <VCard>
        <VCardItem title="Finansial Reservasi">
          <template #subtitle>
            <span class="text-body-2 text-medium-emphasis">
              Pendapatan dari reservasi, pengeluaran dari surat jalan.
            </span>
          </template>
        </VCardItem>
        <VCardText>
          <VRow class="mb-2">
            <VCol cols="12" md="4">
              <div class="text-caption text-medium-emphasis">Total Pendapatan</div>
              <div class="text-h6">{{ formatMoneyId(orderFinancial?.summary.total_revenue) }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-caption text-medium-emphasis">Total Pengeluaran</div>
              <div class="text-h6">{{ formatMoneyId(orderFinancial?.summary.total_expense) }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-caption text-medium-emphasis">Total Profit</div>
              <div class="text-h6" :class="profitClass(orderFinancial?.summary.total_profit || null)">
                {{ formatMoneyId(orderFinancial?.summary.total_profit) }}
              </div>
            </VCol>
          </VRow>

          <VueApexCharts
            type="line"
            height="300"
            :options="orderChartOptions"
            :series="orderChartSeries"
          />

          <VDivider class="my-4" />

          <div class="text-subtitle-2 mb-2">
            Breakdown Pengeluaran Surat Jalan ({{ orderFinancial?.summary.order_count ?? 0 }} reservasi)
          </div>
          <VTable density="compact">
            <tbody>
              <tr v-for="row in orderExpenseRows" :key="row.label">
                <td class="text-medium-emphasis">{{ row.label }}</td>
                <td class="text-end">{{ formatMoneyTable(row.value) }}</td>
              </tr>
            </tbody>
          </VTable>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12">
      <VCard>
        <VCardItem title="Total Keuangan">
          <template #subtitle>
            <span class="text-body-2 text-medium-emphasis">
              Pendapatan dari kontrak dan reservasi. Pengeluaran dari AJK/reservasi, layanan service, dan fasilitas.
            </span>
          </template>
        </VCardItem>
        <VCardText>
          <VRow class="mb-2">
            <VCol cols="12" md="4">
              <div class="text-caption text-medium-emphasis">Total Pendapatan</div>
              <div class="text-h6">{{ formatMoneyId(totalFinancial?.totals.total_revenue) }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-caption text-medium-emphasis">Total Pengeluaran</div>
              <div class="text-h6">{{ formatMoneyId(totalFinancial?.totals.total_expense) }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-caption text-medium-emphasis">Total Profit</div>
              <div class="text-h6" :class="profitClass(totalFinancial?.totals.total_profit || null)">
                {{ formatMoneyId(totalFinancial?.totals.total_profit) }}
              </div>
            </VCol>
          </VRow>

          <VueApexCharts
            type="line"
            height="300"
            :options="totalChartOptions"
            :series="totalChartSeries"
          />

          <VDivider class="my-4" />

          <VRow>
            <VCol cols="12" md="6">
              <div class="text-subtitle-2 mb-2">Breakdown Pendapatan</div>
              <VTable density="compact">
                <tbody>
                  <tr v-for="row in totalRevenueRows" :key="row.label">
                    <td class="text-medium-emphasis">{{ row.label }}</td>
                    <td class="text-end">{{ formatMoneyTable(row.value) }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCol>
            <VCol cols="12" md="6">
              <div class="text-subtitle-2 mb-2">Breakdown Pengeluaran</div>
              <VTable density="compact">
                <tbody>
                  <tr v-for="row in totalExpenseRows" :key="row.label">
                    <td class="text-medium-emphasis">{{ row.label }}</td>
                    <td class="text-end">{{ formatMoneyTable(row.value) }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
    {{ snackbar.text }}
  </VSnackbar>
</template>
