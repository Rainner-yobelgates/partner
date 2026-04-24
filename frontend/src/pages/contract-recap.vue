<script setup lang="ts">
import { ApiError } from '@/services/http'
import {
  contractRecapService,
  type ContractRecapClientOption,
  type ContractRecapRow,
} from '@/services/masters'
import { useAuthStore } from '@/stores/auth'
import { formatRupiah, formatRupiahPlain } from '@/utils/currency'

const authStore = useAuthStore()
const canRecapRead = computed(() => authStore.hasPermission('client-recap:read'))

const now = new Date()
const selectedClientId = ref<string | null>(null)
const month = ref(now.getMonth() + 1)
const year = ref(now.getFullYear())
const startDate = ref('')
const endDate = ref('')

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

const isLoading = ref(false)
const clients = ref<ContractRecapClientOption[]>([])
const recapRow = ref<ContractRecapRow | null>(null)

const snackbar = ref({ show: false, color: 'success' as const, text: '' })

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

const formatMoneyId = (value?: string | null) => {
  return formatRupiah(value)
}
const formatMoneyTable = (value?: string | null) => formatRupiahPlain(value)

const formatDate = (value?: string | null) => {
  if (!value)
    return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

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

const loadClients = async () => {
  if (!canRecapRead.value)
    return

  try {
    const res = await contractRecapService.clients()
    clients.value = res.data
  }
  catch (error) {
    console.error('[pages/contract-recap.vue] loadClients', error)
    clients.value = []
  }
}

const fetchRecap = async () => {
  if (!canRecapRead.value)
    return

  if (!selectedClientId.value) {
    showToast('Client wajib dipilih', 'error')
    return
  }

  isLoading.value = true
  try {
    const res = await contractRecapService.recap(
      selectedClientId.value,
      month.value,
      year.value,
      startDate.value || undefined,
      endDate.value || undefined,
    )
    recapRow.value = res.data
  }
  catch (error) {
    console.error('[pages/contract-recap.vue] fetchRecap', error)
    showToast(getErrorMessage(error), 'error')
    recapRow.value = null
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (!canRecapRead.value)
    return

  await loadClients()

  try {
    const def = await contractRecapService.defaultSelection()
    if (def.data) {
      selectedClientId.value = def.data.client_id
      month.value = def.data.month
      year.value = def.data.year
    }

    if (selectedClientId.value)
      await fetchRecap()
  }
  catch (error) {
    console.error('[pages/contract-recap.vue] default', error)
    showToast(getErrorMessage(error), 'error')
  }
})
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <span class="text-h6">Rekap Klien</span>
      </template>
    </VCardItem>

    <VCardText v-if="canRecapRead">
      <VRow align="end">
        <VCol cols="12" md="3">
          <VSelect
            v-model="selectedClientId"
            label="Client"
            :items="clients"
            item-title="name"
            item-value="id"
          >
            <template #item="{ props: itemProps, item }">
              <VListItem v-bind="itemProps" :title="item.raw.name" :subtitle="item.raw.code || undefined" />
            </template>
          </VSelect>
        </VCol>
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
        <VCol cols="12" sm="6" md="2">
          <VTextField
            v-model="startDate"
            label="Start Date (Created)"
            type="date"
          />
        </VCol>
        <VCol cols="12" sm="6" md="2">
          <VTextField
            v-model="endDate"
            label="End Date (Created)"
            type="date"
          />
        </VCol>
        <VCol cols="12" md="1">
          <VBtn
            color="primary"
            block
            class="mt-1"
            :loading="isLoading"
            :disabled="!selectedClientId"
            @click="fetchRecap"
          >
            Terapkan
          </VBtn>
        </VCol>
      </VRow>
      <p v-if="recapRow?.filter?.created_from || recapRow?.filter?.created_to_before" class="text-caption text-medium-emphasis mt-2 mb-0">
        Filter created_at: {{ recapRow?.filter?.created_from || '-' }} - sebelum {{ recapRow?.filter?.created_to_before || '-' }}
      </p>
    </VCardText>

    <VCardText v-else>
      <p class="text-medium-emphasis mb-0">Anda tidak memiliki akses untuk melihat rekap klien (client-recap:read).</p>
    </VCardText>

    <VDivider />

    <VCardText v-if="canRecapRead && recapRow?.summary">
      <VRow>
        <VCol cols="12" md="4">
          <div class="text-caption text-medium-emphasis">Total pemasukan ({{ recapRow.summary.contract_count }} kontrak)</div>
          <div class="text-h6">{{ formatMoneyId(recapRow.summary.total_income) }}</div>
        </VCol>
        <VCol cols="12" md="4">
          <div class="text-caption text-medium-emphasis">Total pengeluaran antar jemput ({{ recapRow.summary.shuttle_trip_count }} trip)</div>
          <div class="text-h6">{{ formatMoneyId(recapRow.summary.total_expense) }}</div>
        </VCol>
        <VCol cols="12" md="4">
          <div class="text-caption text-medium-emphasis">Total keuntungan / selisih</div>
          <div class="text-h6" :class="profitClass(recapRow.summary.total_profit)">{{ formatMoneyId(recapRow.summary.total_profit) }}</div>
        </VCol>
      </VRow>
    </VCardText>

    <VDivider />

    <VCardText v-if="canRecapRead">
      <VProgressLinear v-if="isLoading" indeterminate color="primary" class="mb-4" />
      <div class="overflow-x-auto">
        <VTable density="compact" class="text-no-wrap">
          <thead>
            <tr>
              <th>Jadwal</th>
              <th>Rute Antar Jemput</th>
              <th>Kendaraan</th>
              <th>Status</th>
              <th class="text-end">Insentif Crew</th>
              <th class="text-end">BBM</th>
              <th class="text-end">Tol</th>
              <th class="text-end">Lain-lain</th>
              <th class="text-end">Total Biaya</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!isLoading && (!recapRow || recapRow.shuttles.length === 0)">
              <td colspan="9" class="text-center text-medium-emphasis py-8">
                Tidak ada data antar jemput pada client dan periode ini.
              </td>
            </tr>
            <tr v-for="shuttle in recapRow?.shuttles || []" :key="shuttle.id">
              <td>{{ formatDate(shuttle.scheduled_date) }}</td>
              <td>{{ shuttle.route_origin || '-' }} -> {{ shuttle.route_destination || '-' }}</td>
              <td>{{ shuttle.vehicle_plate_number || '-' }} <span class="text-medium-emphasis">{{ shuttle.vehicle_type ? `(${shuttle.vehicle_type})` : '' }}</span></td>
              <td>
                <VChip size="x-small" :color="shuttle.status === 'ACTIVE' ? 'success' : 'warning'" label>
                  {{ shuttle.status || '-' }}
                </VChip>
              </td>
              <td class="text-end">{{ formatMoneyTable(shuttle.crew_incentive) }}</td>
              <td class="text-end">{{ formatMoneyTable(shuttle.fuel) }}</td>
              <td class="text-end">{{ formatMoneyTable(shuttle.toll_fee) }}</td>
              <td class="text-end">{{ formatMoneyTable(shuttle.others) }}</td>
              <td class="text-end">{{ formatMoneyTable(shuttle.total_cost) }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </VCardText>
  </VCard>

  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="2800">{{ snackbar.text }}</VSnackbar>
</template>


