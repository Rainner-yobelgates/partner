<script setup lang="ts">
import { ApiError } from '@/services/http'
import { vehicleMasterService, type MasterStatus, type VehicleItem, type VehicleType } from '@/services/masters'
import { useAuthStore } from '@/stores/auth'

type VehicleForm = {
  plate_number: string
  hull_number: string
  frame_number: string
  machine_number: string
  vehicle_type: VehicleType
  brand: string
  model: string
  status: MasterStatus
}

const rows = ref<VehicleItem[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortBy = ref<'created_at' | 'plate_number' | 'updated_at'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const isLoading = ref(false)
const isFormDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isDetailDialogOpen = ref(false)
const isSubmitting = ref(false)
const editedItem = ref<VehicleItem | null>(null)
const detailItem = ref<VehicleItem | null>(null)
const authStore = useAuthStore()

const canCreate = computed(() => authStore.hasPermission('vehicle:create'))
const canUpdate = computed(() => authStore.hasPermission('vehicle:update'))
const canDelete = computed(() => authStore.hasPermission('vehicle:delete'))
const canDetail = computed(() => authStore.hasPermission('vehicle:detail'))

const form = ref<VehicleForm>({
  plate_number: '',
  frame_number: '',
  machine_number: '',
  hull_number: '',
  vehicle_type: 'HIACE',
  brand: '',
  model: '',
  status: 'ACTIVE',
})

const snackbar = ref({ show: false, color: 'success', text: '' })

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const isEditMode = computed(() => Boolean(editedItem.value))

const showToast = (text: string, color: 'success' | 'error' = 'success') => {
  snackbar.value = { show: true, color, text }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError)
    return error.message

  return 'Terjadi kesalahan. Silakan coba lagi.'
}

const formatDate = (value: string) => new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

const fetchVehicles = async () => {
  isLoading.value = true
  try {
    const response = await vehicleMasterService.list({
      page: page.value,
      perPage: perPage.value,
      search: search.value.trim() || undefined,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    })

    rows.value = response.data
    total.value = response.total
  }
  catch (error) {
    console.error('[pages/vehicles.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  editedItem.value = null
  form.value = {
    plate_number: '',
    hull_number: '',
    frame_number: '',
    machine_number: '',
    vehicle_type: 'HIACE',
    brand: '',
    model: '',
    status: 'ACTIVE',
  }
}

const openCreateDialog = () => {
  resetForm()
  isFormDialogOpen.value = true
}

const openEditDialog = (item: VehicleItem) => {
  editedItem.value = item
  form.value = {
    plate_number: item.plate_number || '',
    hull_number: item.hull_number || '',
    frame_number: item.frame_number || '',
    machine_number: item.machine_number || '',
    vehicle_type: item.vehicle_type || 'HIACE',
    brand: item.brand || '',
    model: item.model || '',
    status: item.status || 'ACTIVE',
  }
  isFormDialogOpen.value = true
}

const submitForm = async () => {
  if (isSubmitting.value)
    return

  isSubmitting.value = true

  const payload = {
    plate_number: form.value.plate_number.trim() || undefined,
    hull_number: form.value.hull_number.trim() || undefined,
    frame_number: form.value.frame_number.trim() || undefined,
    machine_number: form.value.machine_number.trim() || undefined,
    vehicle_type: form.value.vehicle_type,
    brand: form.value.brand.trim() || undefined,
    model: form.value.model.trim() || undefined,
    status: form.value.status,
  }

  try {
    if (editedItem.value) {
      await vehicleMasterService.update(editedItem.value.id, payload)
      showToast('Kendaraan berhasil diperbarui')
    }
    else {
      await vehicleMasterService.create(payload)
      showToast('Kendaraan berhasil dibuat')
      page.value = 1
    }

    isFormDialogOpen.value = false
    await fetchVehicles()
  }
  catch (error) {
    console.error('[pages/vehicles.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const openDeleteDialog = (item: VehicleItem) => {
  editedItem.value = item
  isDeleteDialogOpen.value = true
}

const openDetailDialog = (item: VehicleItem) => {
  detailItem.value = item
  isDetailDialogOpen.value = true
}

const confirmDelete = async () => {
  if (!editedItem.value || isSubmitting.value)
    return

  isSubmitting.value = true

  try {
    await vehicleMasterService.remove(editedItem.value.id)
    isDeleteDialogOpen.value = false
    showToast('Kendaraan berhasil dihapus')

    if (rows.value.length === 1 && page.value > 1)
      page.value -= 1

    await fetchVehicles()
  }
  catch (error) {
    console.error('[pages/vehicles.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const onSearch = async () => {
  page.value = 1
  await fetchVehicles()
}

watch([page, perPage, sortBy, sortOrder], fetchVehicles)

onMounted(fetchVehicles)
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <span class="text-h6">Data Kendaraan</span>
          <VBtn v-if="canCreate" color="primary" prepend-icon="ri-add-line" @click="openCreateDialog">
            Tambah Kendaraan
          </VBtn>
        </div>
      </template>
    </VCardItem>

    <VCardText>
      <VRow>
        <VCol cols="12" md="5">
          <VTextField
            v-model="search"
            label="Cari kendaraan"
            placeholder="Plat / rangka / brand / model"
            prepend-inner-icon="ri-search-line"
            @keyup.enter="onSearch"
          />
        </VCol>
        <VCol cols="12" md="2">
          <VBtn block class="mt-md-1" color="secondary" @click="onSearch">Cari</VBtn>
        </VCol>
        <VCol cols="6" md="2">
          <VSelect
            v-model="sortBy"
            label="Urutkan"
            :items="[
              { title: 'Dibuat', value: 'created_at' },
              { title: 'Plat', value: 'plate_number' },
              { title: 'Diubah', value: 'updated_at' },
            ]"
            item-title="title"
            item-value="value"
          />
        </VCol>
        <VCol cols="6" md="1">
          <VSelect
            v-model="sortOrder"
            label="Urutan"
            :items="[
              { title: 'DESC', value: 'desc' },
              { title: 'ASC', value: 'asc' },
            ]"
            item-title="title"
            item-value="value"
          />
        </VCol>
        <VCol cols="12" md="2">
          <VSelect v-model="perPage" label="Per halaman" :items="[10, 20, 50]" />
        </VCol>
      </VRow>
    </VCardText>

    <VDivider />

    <VCardText>
      <VProgressLinear v-if="isLoading" indeterminate color="primary" class="mb-4" />

      <VTable density="comfortable">
        <thead>
          <tr>
            <th>Plat</th>
            <th>No Lambung</th>
            <th>Tipe</th>
            <th>Merek</th>
            <th>Model</th>
            <th>Status</th>
            <th>Dibuat Pada</th>
            <th class="text-end">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!isLoading && rows.length === 0">
            <td colspan="8" class="text-center text-medium-emphasis py-6">Data kendaraan belum ada.</td>
          </tr>
          <tr v-for="item in rows" :key="item.id">
            <td class="font-weight-medium">{{ item.plate_number || '-' }}</td>
            <td>{{ item.hull_number || '-' }}</td>
            <td>{{ item.vehicle_type || '-' }}</td>
            <td>{{ item.brand || '-' }}</td>
            <td>{{ item.model || '-' }}</td>
            <td>
              <VChip size="small" :color="item.status === 'ACTIVE' ? 'success' : 'warning'" label>
                {{ item.status || '-' }}
              </VChip>
            </td>
            <td>{{ formatDate(item.updated_at) }}</td>
            <td class="text-end">
              <VBtn v-if="canDetail" size="small" variant="text" color="secondary" @click="openDetailDialog(item)">Detail</VBtn>
              <VBtn v-if="canUpdate" size="small" variant="text" color="primary" @click="openEditDialog(item)">Ubah</VBtn>
              <VBtn v-if="canDelete" size="small" variant="text" color="error" @click="openDeleteDialog(item)">Hapus</VBtn>
            </td>
          </tr>
        </tbody>
      </VTable>

      <div class="d-flex justify-space-between align-center mt-4 flex-wrap gap-4">
        <span class="text-sm text-medium-emphasis">Total: {{ total }} data</span>
        <VPagination v-model="page" :length="totalPages" :total-visible="7" />
      </div>
    </VCardText>
  </VCard>

  <VDialog v-model="isFormDialogOpen" max-width="720">
    <VCard>
      <VCardItem :title="isEditMode ? 'Ubah Kendaraan' : 'Tambah Kendaraan'" />
      <VCardText>
        <VForm @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField v-model="form.plate_number" label="Nomor Plat" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.hull_number" label="Nomor Lambung" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.frame_number" label="Nomor Rangka" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.machine_number" label="Nomor Mesin" />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.vehicle_type"
                label="Tipe Kendaraan"
                :items="['HIACE', 'MEDIUM_BUS', 'EVALIA']"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect v-model="form.status" label="Status" :items="['ACTIVE', 'INACTIVE']" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.brand" label="Merek" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.model" label="Model" />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isFormDialogOpen = false">Batal</VBtn>
        <VBtn color="primary" :loading="isSubmitting" :disabled="isSubmitting" @click="submitForm">Simpan</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDeleteDialogOpen" max-width="420">
    <VCard>
      <VCardItem title="Hapus Kendaraan" />
      <VCardText>
        Yakin hapus kendaraan <strong>{{ editedItem?.plate_number || editedItem?.id }}</strong>?
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isDeleteDialogOpen = false">Batal</VBtn>
        <VBtn color="error" :loading="isSubmitting" :disabled="isSubmitting" @click="confirmDelete">Hapus</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDetailDialogOpen" max-width="600">
    <VCard>
      <VCardItem title="Detail Kendaraan" />
      <VCardText>
        <VRow>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Plat</div>
                <div class="text-body-1 font-weight-medium text-break">{{ detailItem?.plate_number || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Lambung</div>
                <div class="text-body-1 text-break">{{ detailItem?.hull_number || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Rangka</div>
                <div class="text-body-1 text-break">{{ detailItem?.frame_number || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Mesin</div>
                <div class="text-body-1 text-break">{{ detailItem?.machine_number || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Tipe</div>
                <div class="text-body-1 text-break">{{ detailItem?.vehicle_type || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Merek</div>
                <div class="text-body-1 text-break">{{ detailItem?.brand || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Model</div>
                <div class="text-body-1 text-break">{{ detailItem?.model || '-' }}</div>
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



