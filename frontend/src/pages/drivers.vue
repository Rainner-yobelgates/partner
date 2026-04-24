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
import { useAuthStore } from '@/stores/auth'
import { optionalPhoneRule, sanitizePhoneNumber } from '@/utils/phone'

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
const sortBy = ref<'created_at' | 'name'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const isLoading = ref(false)
const isFormDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isDetailDialogOpen = ref(false)
const isSubmitting = ref(false)
const editedItem = ref<DriverItem | null>(null)
const detailItem = ref<DriverItem | null>(null)
const authStore = useAuthStore()

const canCreate = computed(() => authStore.hasPermission('driver:create'))
const canUpdate = computed(() => authStore.hasPermission('driver:update'))
const canDelete = computed(() => authStore.hasPermission('driver:delete'))
const canDetail = computed(() => authStore.hasPermission('driver:detail'))

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
const phoneRules = [optionalPhoneRule]

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

const fetchVehicleOptions = async () => {
  try {
    const response = await vehicleMasterService.list({
      page: 1,
      perPage: 100,
      sortBy: 'created_at',
      sortOrder: 'desc',
    })
    vehicles.value = response.data.filter(vehicle => vehicle.status === 'ACTIVE')
  }
  catch (error) {
    console.error('[pages/drivers.vue]', error)
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
    console.error('[pages/drivers.vue]', error)
    showToast(getErrorMessage(error), 'error')
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
    phone_number: sanitizePhoneNumber(item.phone_number || ''),
    emergency_contact: sanitizePhoneNumber(item.emergency_contact || ''),
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
    phone_number: sanitizePhoneNumber(form.value.phone_number) || undefined,
    emergency_contact: sanitizePhoneNumber(form.value.emergency_contact) || undefined,
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
    console.error('[pages/drivers.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const onPhoneInput = (field: 'phone_number' | 'emergency_contact') => {
  form.value[field] = sanitizePhoneNumber(form.value[field])
}

const openDeleteDialog = (item: DriverItem) => {
  editedItem.value = item
  isDeleteDialogOpen.value = true
}

const openDetailDialog = (item: DriverItem) => {
  detailItem.value = item
  isDetailDialogOpen.value = true
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
    console.error('[pages/drivers.vue]', error)
    showToast(getErrorMessage(error), 'error')
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
          <VBtn v-if="canCreate" color="primary" prepend-icon="ri-add-line" @click="openCreateDialog">
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
            <th>Dibuat Pada</th>
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
            <td>{{ formatDate(item.created_at) }}</td>
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
      <VCardItem :title="isEditMode ? 'Ubah Pengemudi' : 'Tambah Pengemudi'" />
      <VCardText>
        <VForm @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField v-model="form.name" label="Nama" :rules="[v => !!v || 'Nama wajib diisi']" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.phone_number"
                label="Nomor Telepon"
                type="tel"
                inputmode="numeric"
                :maxlength="15"
                :rules="phoneRules"
                @update:model-value="onPhoneInput('phone_number')"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.emergency_contact"
                label="Kontak Darurat"
                type="tel"
                inputmode="numeric"
                :maxlength="15"
                :rules="phoneRules"
                @update:model-value="onPhoneInput('emergency_contact')"
              />
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

  <VDialog v-model="isDetailDialogOpen" max-width="600">
    <VCard>
      <VCardItem title="Detail Pengemudi" />
      <VCardText>
        <VRow>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Nama</div>
                <div class="text-body-1 font-weight-medium text-break">{{ detailItem?.name || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Telepon</div>
                <div class="text-body-1 text-break">{{ detailItem?.phone_number || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Kontak Darurat</div>
                <div class="text-body-1 text-break">{{ detailItem?.emergency_contact || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Tipe</div>
                <div class="text-body-1 text-break">{{ detailItem?.type || '-' }}</div>
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
                <div class="text-caption text-medium-emphasis mb-1">Status</div>
                <div class="text-body-1 text-break">{{ detailItem?.status || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Alamat</div>
                <div class="text-body-1 text-break">{{ detailItem?.address || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Dibuat</div>
                <div class="text-body-1 text-break">{{ detailItem ? formatDate(detailItem.created_at) : '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
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

