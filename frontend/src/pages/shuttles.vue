<script setup lang="ts">
import { ApiError } from '@/services/http'
import {
  clientMasterService,
  routeMasterService,
  shuttleMasterService,
  vehicleMasterService,
  type ClientItem,
  type MasterStatus,
  type RouteItem,
  type ShuttleItem,
  type VehicleItem,
} from '@/services/masters'
import { useAuthStore } from '@/stores/auth'
import {
  blockKeysNonDecimalMoney,
  parseOptionalApiDecimalMoney,
  sanitizeDecimalMoneyInput,
} from '@/utils/money-input'
import { formatRupiah, formatRupiahPlain } from '@/utils/currency'

type ShuttleForm = {
  client_id: string
  vehicle_id: string
  route_id: string
  crew_incentive: string
  scheduled_date: string
  fuel: string
  toll_fee: string
  others: string
  status: MasterStatus
}

const rows = ref<ShuttleItem[]>([])
const clients = ref<ClientItem[]>([])
const vehicles = ref<VehicleItem[]>([])
const routes = ref<RouteItem[]>([])

const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const sortBy = ref<'scheduled_date' | 'created_at'>('scheduled_date')
const sortOrder = ref<'asc' | 'desc'>('desc')
const isLoading = ref(false)
const isSubmitting = ref(false)
const isFormDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isDetailDialogOpen = ref(false)
const editedItem = ref<ShuttleItem | null>(null)
const detailItem = ref<ShuttleItem | null>(null)
const authStore = useAuthStore()

const canCreate = computed(() => authStore.hasPermission('shuttle:create'))
const canUpdate = computed(() => authStore.hasPermission('shuttle:update'))
const canDelete = computed(() => authStore.hasPermission('shuttle:delete'))
const canDetail = computed(() => authStore.hasPermission('shuttle:detail'))

const form = ref<ShuttleForm>({
  client_id: '',
  vehicle_id: '',
  route_id: '',
  crew_incentive: '',
  scheduled_date: '',
  fuel: '',
  toll_fee: '',
  others: '',
  status: 'ACTIVE',
})

const snackbar = ref({ show: false, color: 'success', text: '' })
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const isEditMode = computed(() => Boolean(editedItem.value))

const clientOptions = computed(() => clients.value.map(c => ({
  title: c.code ? `${c.name} (${c.code})` : (c.name || `Klien #${c.id}`),
  value: c.id,
})))

const vehicleOptions = computed(() => vehicles.value.map(item => ({ title: item.plate_number || `Kendaraan #${item.id}`, value: item.id })))
const routeOptions = computed(() => routes.value.map(item => ({ title: `${item.origin || '-'} -> ${item.destination || '-'}`, value: item.id })))

const showToast = (text: string, color: 'success' | 'error' = 'success') => { snackbar.value = { show: true, color, text } }
const getErrorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'Terjadi kesalahan. Silakan coba lagi.'
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-'

const formatMoneyId = (value?: string | null) => {
  return formatRupiah(value)
}
const formatMoneyTable = (value?: string | null) => formatRupiahPlain(value)

const onMoneyFieldInput = (field: 'crew_incentive' | 'fuel' | 'toll_fee' | 'others', v: string) => {
  form.value[field] = sanitizeDecimalMoneyInput(String(v ?? ''))
}

const fromIsoToInputDate = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : ''
const toIsoDate = (value: string) => value ? new Date(value).toISOString() : undefined

const fetchOptions = async () => {
  await Promise.all([
    clientMasterService.list({ page: 1, perPage: 100, sortBy: 'created_at', sortOrder: 'desc' }).then(res => { clients.value = res.data.filter(c => c.status === 'ACTIVE') }).catch(() => {}),
    vehicleMasterService.list({ page: 1, perPage: 100, sortBy: 'created_at', sortOrder: 'desc' }).then(res => { vehicles.value = res.data.filter(vehicle => vehicle.status === 'ACTIVE') }).catch(() => {}),
    routeMasterService.list({ page: 1, perPage: 100, sortBy: 'created_at', sortOrder: 'desc' }).then(res => { routes.value = res.data.filter(route => route.status === 'ACTIVE') }).catch(() => {}),
  ])
}

const fetchShuttles = async () => {
  isLoading.value = true
  try {
    const response = await shuttleMasterService.list({
      page: page.value,
      perPage: perPage.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    })
    rows.value = response.data
    total.value = response.total
  }
  catch (error) {
    console.error('[pages/shuttles.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally { isLoading.value = false }
}

const resetForm = () => {
  editedItem.value = null
  form.value = { client_id: '', vehicle_id: '', route_id: '', crew_incentive: '', scheduled_date: '', fuel: '', toll_fee: '', others: '', status: 'ACTIVE' }
}

const openCreateDialog = () => { resetForm(); isFormDialogOpen.value = true }
const openEditDialog = (item: ShuttleItem) => {
  editedItem.value = item
  form.value = {
    client_id: item.client_id || '',
    vehicle_id: item.vehicle_id || '',
    route_id: item.route_id || '',
    crew_incentive: item.crew_incentive?.trim() ? item.crew_incentive : '',
    scheduled_date: fromIsoToInputDate(item.scheduled_date),
    fuel: item.fuel?.trim() ? item.fuel : '',
    toll_fee: item.toll_fee?.trim() ? item.toll_fee : '',
    others: item.others?.trim() ? item.others : '',
    status: item.status || 'ACTIVE',
  }
  isFormDialogOpen.value = true
}

const submitForm = async () => {
  if (isSubmitting.value) return

  if (!form.value.client_id.trim()) {
    showToast('Klien wajib dipilih', 'error')
    return
  }

  const ci = parseOptionalApiDecimalMoney(form.value.crew_incentive)
  const fu = parseOptionalApiDecimalMoney(form.value.fuel)
  const tf = parseOptionalApiDecimalMoney(form.value.toll_fee)
  const ot = parseOptionalApiDecimalMoney(form.value.others)
  const moneyInvalidMsg = 'Nilai uang tidak valid. Hanya angka; titik untuk desimal (maks. 13 digit bulat, 2 desimal).'
  if (ci === '__invalid__' || fu === '__invalid__' || tf === '__invalid__' || ot === '__invalid__') {
    showToast(moneyInvalidMsg, 'error')
    return
  }

  isSubmitting.value = true

  const payload = {
    client_id: form.value.client_id,
    vehicle_id: form.value.vehicle_id || undefined,
    route_id: form.value.route_id || undefined,
    ...(ci !== undefined && { crew_incentive: ci }),
    scheduled_date: toIsoDate(form.value.scheduled_date),
    ...(fu !== undefined && { fuel: fu }),
    ...(tf !== undefined && { toll_fee: tf }),
    ...(ot !== undefined && { others: ot }),
    status: form.value.status,
  }

  try {
    if (editedItem.value) {
      await shuttleMasterService.update(editedItem.value.id, payload)
      showToast('Antar jemput berhasil diperbarui')
    } else {
      await shuttleMasterService.create(payload)
      showToast('Antar jemput berhasil dibuat')
      page.value = 1
    }
    isFormDialogOpen.value = false
    await fetchShuttles()
  }
  catch (error) {
    console.error('[pages/shuttles.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally { isSubmitting.value = false }
}

const openDeleteDialog = (item: ShuttleItem) => { editedItem.value = item; isDeleteDialogOpen.value = true }
const openDetailDialog = (item: ShuttleItem) => { detailItem.value = item; isDetailDialogOpen.value = true }
const confirmDelete = async () => {
  if (!editedItem.value || isSubmitting.value) return
  isSubmitting.value = true
  try {
    await shuttleMasterService.remove(editedItem.value.id)
    isDeleteDialogOpen.value = false
    showToast('Antar jemput berhasil dihapus')
    if (rows.value.length === 1 && page.value > 1) page.value -= 1
    await fetchShuttles()
  }
  catch (error) {
    console.error('[pages/shuttles.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally { isSubmitting.value = false }
}

watch([page, perPage, sortBy, sortOrder], fetchShuttles)

onMounted(async () => { await fetchOptions(); await fetchShuttles() })
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <span class="text-h6">Data Antar Jemput</span>
          <VBtn v-if="canCreate" color="primary" prepend-icon="ri-add-line" @click="openCreateDialog">Tambah Antar Jemput</VBtn>
        </div>
      </template>
    </VCardItem>
    <VCardText>
      <VRow>
        <VCol cols="6" md="3"><VSelect v-model="sortBy" label="Urutkan" :items="[{ title: 'Jadwal', value: 'scheduled_date' },{ title: 'Dibuat', value: 'created_at' },]" item-title="title" item-value="value" /></VCol>
        <VCol cols="6" md="2"><VSelect v-model="sortOrder" label="Urutan" :items="[{ title:'DESC', value:'desc'},{ title:'ASC', value:'asc'}]" item-title="title" item-value="value" /></VCol>
        <VCol cols="12" md="2"><VSelect v-model="perPage" label="Per halaman" :items="[10,20,50]" /></VCol>
      </VRow>
    </VCardText>
    <VDivider />
    <VCardText>
      <VProgressLinear v-if="isLoading" indeterminate color="primary" class="mb-4" />
      <VTable density="comfortable">
        <thead>
          <tr><th>Klien</th><th>Kendaraan</th><th>Rute</th><th>Jadwal</th><th>Insentif Kru</th><th>Status</th><th class="text-end">Aksi</th></tr>
        </thead>
        <tbody>
          <tr v-if="!isLoading && rows.length===0"><td colspan="7" class="text-center text-medium-emphasis py-6">Data antar jemput belum ada.</td></tr>
          <tr v-for="item in rows" :key="item.id">
            <td>{{ item.client?.name || '-' }}</td>
            <td>{{ item.vehicle?.plate_number || '-' }}</td>
            <td>{{ item.route ? `${item.route.origin || '-'} -> ${item.route.destination || '-'}` : '-' }}</td>
            <td>{{ formatDate(item.scheduled_date) }}</td>
            <td>{{ formatMoneyTable(item.crew_incentive) }}</td>
            <td><VChip size="small" :color="item.status === 'ACTIVE' ? 'success' : 'warning'" label>{{ item.status || '-' }}</VChip></td>
            <td class="text-end">
              <VBtn v-if="canDetail" size="small" variant="text" color="secondary" @click="openDetailDialog(item)">Detail</VBtn>
              <VBtn v-if="canUpdate" size="small" variant="text" color="primary" @click="openEditDialog(item)">Ubah</VBtn>
              <VBtn v-if="canDelete" size="small" variant="text" color="error" @click="openDeleteDialog(item)">Hapus</VBtn>
            </td>
          </tr>
        </tbody>
      </VTable>
      <div class="d-flex justify-space-between align-center mt-4 flex-wrap gap-4"><span class="text-sm text-medium-emphasis">Total: {{ total }} data</span><VPagination v-model="page" :length="totalPages" :total-visible="7" /></div>
    </VCardText>
  </VCard>

  <VDialog v-model="isFormDialogOpen" max-width="900">
    <VCard>
      <VCardItem :title="isEditMode ? 'Ubah Antar Jemput' : 'Tambah Antar Jemput'" />
      <VCardText>
        <VForm @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12" md="4"><VSelect v-model="form.client_id" label="Klien" :items="clientOptions" item-title="title" item-value="value" /></VCol>
            <VCol cols="12" md="4"><VSelect v-model="form.vehicle_id" label="Kendaraan" :items="vehicleOptions" item-title="title" item-value="value" /></VCol>
            <VCol cols="12" md="4"><VSelect v-model="form.route_id" label="Rute" :items="routeOptions" item-title="title" item-value="value" /></VCol>
            <VCol cols="12" md="4"><VTextField v-model="form.scheduled_date" type="datetime-local" label="Jadwal" /></VCol>
            <VCol cols="12" md="4">
              <VTextField
                :model-value="form.crew_incentive"
                label="Insentif Kru"
                placeholder="150000.00"
                inputmode="decimal"
                autocomplete="off"
                @update:model-value="v => onMoneyFieldInput('crew_incentive', v)"
                @keydown="blockKeysNonDecimalMoney"
              />
            </VCol>
            <VCol cols="12" md="4"><VSelect v-model="form.status" label="Status" :items="['ACTIVE','INACTIVE']" /></VCol>
            <VCol cols="12" md="4">
              <VTextField
                :model-value="form.fuel"
                label="BBM"
                placeholder="200000.00"
                inputmode="decimal"
                autocomplete="off"
                @update:model-value="v => onMoneyFieldInput('fuel', v)"
                @keydown="blockKeysNonDecimalMoney"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                :model-value="form.toll_fee"
                label="Biaya Tol"
                placeholder="50000.00"
                inputmode="decimal"
                autocomplete="off"
                @update:model-value="v => onMoneyFieldInput('toll_fee', v)"
                @keydown="blockKeysNonDecimalMoney"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                :model-value="form.others"
                label="Lainnya"
                placeholder="0.00"
                inputmode="decimal"
                autocomplete="off"
                @update:model-value="v => onMoneyFieldInput('others', v)"
                @keydown="blockKeysNonDecimalMoney"
              />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="justify-end"><VBtn variant="text" @click="isFormDialogOpen=false">Batal</VBtn><VBtn color="primary" :loading="isSubmitting" :disabled="isSubmitting" @click="submitForm">Simpan</VBtn></VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDeleteDialogOpen" max-width="420"><VCard><VCardItem title="Hapus Antar Jemput" /><VCardText>Yakin hapus antar jemput <strong>{{ editedItem?.shuttles_uuid }}</strong>?</VCardText><VCardActions class="justify-end"><VBtn variant="text" @click="isDeleteDialogOpen=false">Batal</VBtn><VBtn color="error" :loading="isSubmitting" :disabled="isSubmitting" @click="confirmDelete">Hapus</VBtn></VCardActions></VCard></VDialog>

  <VDialog v-model="isDetailDialogOpen" max-width="700">
    <VCard>
      <VCardItem title="Detail Antar Jemput" />
      <VCardText>
        <VRow>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Klien</div>
                <div class="text-body-1 font-weight-medium text-break">{{ detailItem?.client?.name || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Kendaraan</div>
                <div class="text-body-1 text-break">{{ detailItem?.vehicle?.plate_number || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Rute</div>
                <div class="text-body-1 text-break">{{ detailItem?.route ? `${detailItem.route.origin || '-'} -> ${detailItem.route.destination || '-'}` : '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Jadwal</div>
                <div class="text-body-1 text-break">{{ detailItem ? formatDate(detailItem.scheduled_date) : '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Insentif Kru</div>
                <div class="text-body-1 text-break">{{ detailItem ? formatMoneyId(detailItem.crew_incentive) : '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">BBM</div>
                <div class="text-body-1 text-break">{{ detailItem ? formatMoneyId(detailItem.fuel) : '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Biaya Tol</div>
                <div class="text-body-1 text-break">{{ detailItem ? formatMoneyId(detailItem.toll_fee) : '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Lainnya</div>
                <div class="text-body-1 text-break">{{ detailItem ? formatMoneyId(detailItem.others) : '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Status</div>
                <div class="text-body-1 text-break">{{ detailItem?.status || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Dibuat</div>
                <div class="text-body-1 text-break">{{ detailItem ? formatDate(detailItem.created_at) : '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Diubah</div>
                <div class="text-body-1 text-break">{{ detailItem ? formatDate(detailItem.updated_at) : '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isDetailDialogOpen=false">Tutup</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="2500">{{ snackbar.text }}</VSnackbar>
</template>

