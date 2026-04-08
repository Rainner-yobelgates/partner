<script setup lang="ts">
import { ApiError } from '@/services/http'
import {
  contractMasterService,
  routeMasterService,
  shuttleMasterService,
  vehicleMasterService,
  type ContractItem,
  type MasterStatus,
  type RouteItem,
  type ShuttleItem,
  type VehicleItem,
} from '@/services/masters'
import { useAuthStore } from '@/stores/auth'

type ShuttleForm = {
  contract_id: string
  vehicle_id: string
  route_id: string
  crew_incentive: number | null
  scheduled_date: string
  fuel: number | null
  toll_fee: number | null
  others: number | null
  status: MasterStatus
}

const rows = ref<ShuttleItem[]>([])
const contracts = ref<ContractItem[]>([])
const vehicles = ref<VehicleItem[]>([])
const routes = ref<RouteItem[]>([])

const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const sortBy = ref<'scheduled_date' | 'created_at' | 'updated_at'>('scheduled_date')
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
  contract_id: '',
  vehicle_id: '',
  route_id: '',
  crew_incentive: null,
  scheduled_date: '',
  fuel: null,
  toll_fee: null,
  others: null,
  status: 'ACTIVE',
})

const snackbar = ref({ show: false, color: 'success', text: '' })
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const isEditMode = computed(() => Boolean(editedItem.value))

const contractOptions = computed(() => contracts.value.map(item => ({ title: item.contract_number || `Kontrak #${item.id}`, value: item.id })))
const vehicleOptions = computed(() => vehicles.value.map(item => ({ title: item.plate_number || `Kendaraan #${item.id}`, value: item.id })))
const routeOptions = computed(() => routes.value.map(item => ({ title: `${item.origin || '-'} -> ${item.destination || '-'}`, value: item.id })))

const showToast = (text: string, color: 'success' | 'error' = 'success') => { snackbar.value = { show: true, color, text } }
const getErrorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'Terjadi kesalahan. Silakan coba lagi.'
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-'
const fromIsoToInputDate = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : ''
const toIsoDate = (value: string) => value ? new Date(value).toISOString() : undefined

const fetchOptions = async () => {
  await Promise.all([
    contractMasterService.list({ page: 1, perPage: 100, sortBy: 'created_at', sortOrder: 'desc' }).then(res => { contracts.value = res.data.filter(contract => contract.status === 'ACTIVE') }).catch(() => {}),
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
  form.value = { contract_id: '', vehicle_id: '', route_id: '', crew_incentive: null, scheduled_date: '', fuel: null, toll_fee: null, others: null, status: 'ACTIVE' }
}

const openCreateDialog = () => { resetForm(); isFormDialogOpen.value = true }
const openEditDialog = (item: ShuttleItem) => {
  editedItem.value = item
  form.value = {
    contract_id: item.contract_id || '',
    vehicle_id: item.vehicle_id || '',
    route_id: item.route_id || '',
    crew_incentive: item.crew_incentive ?? null,
    scheduled_date: fromIsoToInputDate(item.scheduled_date),
    fuel: item.fuel ?? null,
    toll_fee: item.toll_fee ?? null,
    others: item.others ?? null,
    status: item.status || 'ACTIVE',
  }
  isFormDialogOpen.value = true
}

const submitForm = async () => {
  if (isSubmitting.value) return
  isSubmitting.value = true

  const payload = {
    contract_id: form.value.contract_id || undefined,
    vehicle_id: form.value.vehicle_id || undefined,
    route_id: form.value.route_id || undefined,
    crew_incentive: form.value.crew_incentive ?? undefined,
    scheduled_date: toIsoDate(form.value.scheduled_date),
    fuel: form.value.fuel ?? undefined,
    toll_fee: form.value.toll_fee ?? undefined,
    others: form.value.others ?? undefined,
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
        <VCol cols="6" md="3"><VSelect v-model="sortBy" label="Urutkan" :items="[{ title: 'Jadwal', value: 'scheduled_date' },{ title: 'Dibuat', value: 'created_at' },{ title: 'Diubah', value: 'updated_at' }]" item-title="title" item-value="value" /></VCol>
        <VCol cols="6" md="2"><VSelect v-model="sortOrder" label="Urutan" :items="[{ title:'DESC', value:'desc'},{ title:'ASC', value:'asc'}]" item-title="title" item-value="value" /></VCol>
        <VCol cols="12" md="2"><VSelect v-model="perPage" label="Per halaman" :items="[10,20,50]" /></VCol>
      </VRow>
    </VCardText>
    <VDivider />
    <VCardText>
      <VProgressLinear v-if="isLoading" indeterminate color="primary" class="mb-4" />
      <VTable density="comfortable">
        <thead>
          <tr><th>Kontrak</th><th>Kendaraan</th><th>Rute</th><th>Jadwal</th><th>Insentif Kru</th><th>Status</th><th class="text-end">Aksi</th></tr>
        </thead>
        <tbody>
          <tr v-if="!isLoading && rows.length===0"><td colspan="7" class="text-center text-medium-emphasis py-6">Data antar jemput belum ada.</td></tr>
          <tr v-for="item in rows" :key="item.id">
            <td>{{ item.contract?.contract_number || '-' }}</td>
            <td>{{ item.vehicle?.plate_number || '-' }}</td>
            <td>{{ item.route ? `${item.route.origin || '-'} -> ${item.route.destination || '-'}` : '-' }}</td>
            <td>{{ formatDate(item.scheduled_date) }}</td>
            <td>{{ item.crew_incentive ?? '-' }}</td>
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
            <VCol cols="12" md="4"><VSelect v-model="form.contract_id" label="Kontrak" :items="contractOptions" item-title="title" item-value="value" /></VCol>
            <VCol cols="12" md="4"><VSelect v-model="form.vehicle_id" label="Kendaraan" :items="vehicleOptions" item-title="title" item-value="value" /></VCol>
            <VCol cols="12" md="4"><VSelect v-model="form.route_id" label="Rute" :items="routeOptions" item-title="title" item-value="value" /></VCol>
            <VCol cols="12" md="4"><VTextField v-model="form.scheduled_date" type="datetime-local" label="Jadwal" /></VCol>
            <VCol cols="12" md="4"><VTextField v-model.number="form.crew_incentive" type="number" label="Insentif Kru" /></VCol>
            <VCol cols="12" md="4"><VSelect v-model="form.status" label="Status" :items="['ACTIVE','INACTIVE']" /></VCol>
            <VCol cols="12" md="4"><VTextField v-model.number="form.fuel" type="number" label="BBM" /></VCol>
            <VCol cols="12" md="4"><VTextField v-model.number="form.toll_fee" type="number" label="Biaya Tol" /></VCol>
            <VCol cols="12" md="4"><VTextField v-model.number="form.others" type="number" label="Lainnya" /></VCol>
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
        <VTable density="compact">
          <tbody>
            <tr><td>Kontrak</td><td class="text-end font-weight-medium">{{ detailItem?.contract?.contract_number || '-' }}</td></tr>
            <tr><td>Kendaraan</td><td class="text-end">{{ detailItem?.vehicle?.plate_number || '-' }}</td></tr>
            <tr><td>Rute</td><td class="text-end">{{ detailItem?.route ? `${detailItem.route.origin || '-'} -> ${detailItem.route.destination || '-'}` : '-' }}</td></tr>
            <tr><td>Jadwal</td><td class="text-end">{{ detailItem ? formatDate(detailItem.scheduled_date) : '-' }}</td></tr>
            <tr><td>Insentif Kru</td><td class="text-end">{{ detailItem?.crew_incentive ?? '-' }}</td></tr>
            <tr><td>BBM</td><td class="text-end">{{ detailItem?.fuel ?? '-' }}</td></tr>
            <tr><td>Biaya Tol</td><td class="text-end">{{ detailItem?.toll_fee ?? '-' }}</td></tr>
            <tr><td>Lainnya</td><td class="text-end">{{ detailItem?.others ?? '-' }}</td></tr>
            <tr><td>Status</td><td class="text-end">{{ detailItem?.status || '-' }}</td></tr>
            <tr><td>Dibuat</td><td class="text-end">{{ detailItem ? formatDate(detailItem.created_at) : '-' }}</td></tr>
            <tr><td>Diubah</td><td class="text-end">{{ detailItem ? formatDate(detailItem.updated_at) : '-' }}</td></tr>
          </tbody>
        </VTable>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isDetailDialogOpen=false">Tutup</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="2500">{{ snackbar.text }}</VSnackbar>
</template>


