<script setup lang="ts">
import { ApiError } from '@/services/http'
import {
  driverMasterService,
  vehicleMasterService,
  type DriverItem,
  type DriverType,
  type MasterStatus,
  type VehicleItem,
} from '@/services/masters'

type DriverForm = {
  name: string
  phone_number: string
  emergency_contact: string
  address: string
  type: DriverType
  status: MasterStatus
  vehicle_id: string
}

const rows = ref<DriverItem[]>([])
const vehicles = ref<VehicleItem[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortBy = ref<'created_at' | 'name' | 'updated_at'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const isLoading = ref(false)
const isFormDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isSubmitting = ref(false)
const editedItem = ref<DriverItem | null>(null)

const form = ref<DriverForm>({
  name: '',
  phone_number: '',
  emergency_contact: '',
  address: '',
  type: 'MAIN',
  status: 'ACTIVE',
  vehicle_id: '',
})

const snackbar = ref({ show: false, color: 'success', text: '' })

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const isEditMode = computed(() => Boolean(editedItem.value))

const vehicleOptions = computed(() => vehicles.value.map(vehicle => ({
  title: vehicle.plate_number || `Kendaraan #${vehicle.id}`,
  value: vehicle.id,
})))

const showToast = (text: string, color: 'success' | 'error' = 'success') => {
  snackbar.value = { show: true, color, text }
}

const normalizeErrorMessage = (error: unknown) => {
  if (error instanceof ApiError)
    return error.message

  return 'Terjadi kesalahan. Silakan coba lagi.'
}

const formatDate = (value: string) => new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

const fetchVehicleOptions = async () => {
  try {
    const response = await vehicleMasterService.list({
      page: 1,
      perPage: 100,
      sortBy: 'created_at',
      sortOrder: 'desc',
    })
    vehicles.value = response.data
  }
  catch {
    // ignore
  }
}

const fetchDrivers = async () => {
  isLoading.value = true

  try {
    const response = await driverMasterService.list({
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
    showToast(normalizeErrorMessage(error), 'error')
  }
  finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  editedItem.value = null
  form.value = {
    name: '',
    phone_number: '',
    emergency_contact: '',
    address: '',
    type: 'MAIN',
    status: 'ACTIVE',
    vehicle_id: '',
  }
}

const openCreateDialog = () => {
  resetForm()
  isFormDialogOpen.value = true
}

const openEditDialog = (item: DriverItem) => {
  editedItem.value = item
  form.value = {
    name: item.name,
    phone_number: item.phone_number || '',
    emergency_contact: item.emergency_contact || '',
    address: item.address || '',
    type: item.type || 'MAIN',
    status: item.status || 'ACTIVE',
    vehicle_id: item.vehicle_id || '',
  }
  isFormDialogOpen.value = true
}

const submitForm = async () => {
  if (isSubmitting.value)
    return

  isSubmitting.value = true

  const payload = {
    name: form.value.name.trim(),
    phone_number: form.value.phone_number.trim() || undefined,
    emergency_contact: form.value.emergency_contact.trim() || undefined,
    address: form.value.address.trim() || undefined,
    type: form.value.type,
    status: form.value.status,
    vehicle_id: form.value.vehicle_id || undefined,
  }

  try {
    if (editedItem.value) {
      await driverMasterService.update(editedItem.value.id, payload)
      showToast('Pengemudi berhasil diperbarui')
    }
    else {
      await driverMasterService.create(payload)
      showToast('Pengemudi berhasil dibuat')
      page.value = 1
    }

    isFormDialogOpen.value = false
    await fetchDrivers()
  }
  catch (error) {
    showToast(normalizeErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const openDeleteDialog = (item: DriverItem) => {
  editedItem.value = item
  isDeleteDialogOpen.value = true
}

const confirmDelete = async () => {
  if (!editedItem.value || isSubmitting.value)
    return

  isSubmitting.value = true

  try {
    await driverMasterService.remove(editedItem.value.id)
    isDeleteDialogOpen.value = false
    showToast('Pengemudi berhasil dihapus')

    if (rows.value.length === 1 && page.value > 1)
      page.value -= 1

    await fetchDrivers()
  }
  catch (error) {
    showToast(normalizeErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const onSearch = async () => {
  page.value = 1
  await fetchDrivers()
}

watch([page, perPage, sortBy, sortOrder], fetchDrivers)

onMounted(async () => {
  await fetchVehicleOptions()
  await fetchDrivers()
})
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <span class="text-h6">Data Pengemudi</span>
          <VBtn color="primary" prepend-icon="ri-add-line" @click="openCreateDialog">
            Tambah Pengemudi
          </VBtn>
        </div>
      </template>
    </VCardItem>

    <VCardText>
      <VRow>
        <VCol cols="12" md="5">
          <VTextField
            v-model="search"
            label="Cari pengemudi"
            placeholder="Nama / telepon / alamat"
            clearable
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
              { title: 'Nama', value: 'name' },
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
            <th>Nama</th>
            <th>Telepon</th>
            <th>Tipe</th>
            <th>Kendaraan</th>
            <th>Status</th>
            <th>Diubah Pada</th>
            <th class="text-end">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!isLoading && rows.length === 0">
            <td colspan="7" class="text-center text-medium-emphasis py-6">Data pengemudi belum ada.</td>
          </tr>
          <tr v-for="item in rows" :key="item.id">
            <td class="font-weight-medium">{{ item.name }}</td>
            <td>{{ item.phone_number || '-' }}</td>
            <td>{{ item.type || '-' }}</td>
            <td>{{ item.vehicle?.plate_number || '-' }}</td>
            <td>
              <VChip size="small" :color="item.status === 'ACTIVE' ? 'success' : 'warning'" label>
                {{ item.status || '-' }}
              </VChip>
            </td>
            <td>{{ formatDate(item.updated_at) }}</td>
            <td class="text-end">
              <VBtn size="small" variant="text" color="primary" @click="openEditDialog(item)">Ubah</VBtn>
              <VBtn size="small" variant="text" color="error" @click="openDeleteDialog(item)">Hapus</VBtn>
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
      <VCardItem :title="isEditMode ? 'Ubah Pengemudi' : 'Tambah Pengemudi'" />
      <VCardText>
        <VForm @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField v-model="form.name" label="Nama" :rules="[v => !!v || 'Nama wajib diisi']" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.phone_number" label="Nomor Telepon" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.emergency_contact" label="Kontak Darurat" />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect v-model="form.type" label="Tipe Pengemudi" :items="['MAIN', 'ASSISTANT', 'RESERVE']" />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.vehicle_id"
                label="Kendaraan"
                :items="vehicleOptions"
                item-title="title"
                item-value="value"
                clearable
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect v-model="form.status" label="Status" :items="['ACTIVE', 'INACTIVE']" />
            </VCol>
            <VCol cols="12">
              <VTextarea v-model="form.address" label="Alamat" rows="2" />
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
      <VCardItem title="Hapus Pengemudi" />
      <VCardText>Yakin hapus pengemudi <strong>{{ editedItem?.name }}</strong>?</VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isDeleteDialogOpen = false">Batal</VBtn>
        <VBtn color="error" :loading="isSubmitting" :disabled="isSubmitting" @click="confirmDelete">Hapus</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="2500">{{ snackbar.text }}</VSnackbar>
</template>


