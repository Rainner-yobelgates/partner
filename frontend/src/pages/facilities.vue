<script setup lang="ts">
import { ApiError } from '@/services/http'
import { useAuthStore } from '@/stores/auth'
import { facilityMasterService, type FacilityItem, type MasterStatus } from '@/services/masters'
import { blockKeysInvalidNumberMoneyInput } from '@/utils/money-input'

type FacilityForm = {
  name: string
  cost: number | null
  description: string
  status: MasterStatus
}

const rows = ref<FacilityItem[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortBy = ref<'created_at' | 'name' | 'updated_at'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const isLoading = ref(false)
const isSubmitting = ref(false)
const isFormDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isDetailDialogOpen = ref(false)
const editedItem = ref<FacilityItem | null>(null)
const detailItem = ref<FacilityItem | null>(null)
const authStore = useAuthStore()

const canCreate = computed(() => authStore.hasPermission('facility:create'))
const canUpdate = computed(() => authStore.hasPermission('facility:update'))
const canDelete = computed(() => authStore.hasPermission('facility:delete'))
const canDetail = computed(() => authStore.hasPermission('facility:detail'))

const form = ref<FacilityForm>({
  name: '',
  cost: null,
  description: '',
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

const fetchFacilities = async () => {
  isLoading.value = true
  try {
    const response = await facilityMasterService.list({
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
    console.error('[pages/facilities.vue]', error)
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
    cost: null,
    description: '',
    status: 'ACTIVE',
  }
}

const openCreateDialog = () => {
  resetForm()
  isFormDialogOpen.value = true
}

const openEditDialog = (item: FacilityItem) => {
  editedItem.value = item
  form.value = {
    name: item.name,
    cost: item.cost ?? null,
    description: item.description || '',
    status: item.status || 'ACTIVE',
  }
  isFormDialogOpen.value = true
}

const submitForm = async () => {
  if (isSubmitting.value)
    return

  isSubmitting.value = true

  if (form.value.cost === null || Number.isNaN(form.value.cost)) {
    showToast('Biaya wajib diisi', 'error')
    isSubmitting.value = false
    return
  }

  const payload = {
    name: form.value.name.trim(),
    cost: form.value.cost,
    description: form.value.description.trim() || undefined,
    status: form.value.status,
  }

  try {
    if (editedItem.value) {
      await facilityMasterService.update(editedItem.value.id, payload)
      showToast('Fasilitas berhasil diperbarui')
    }
    else {
      await facilityMasterService.create(payload)
      showToast('Fasilitas berhasil dibuat')
      page.value = 1
    }

    isFormDialogOpen.value = false
    await fetchFacilities()
  }
  catch (error) {
    console.error('[pages/facilities.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const openDeleteDialog = (item: FacilityItem) => {
  editedItem.value = item
  isDeleteDialogOpen.value = true
}

const openDetailDialog = (item: FacilityItem) => {
  detailItem.value = item
  isDetailDialogOpen.value = true
}

const confirmDelete = async () => {
  if (!editedItem.value || isSubmitting.value)
    return

  isSubmitting.value = true

  try {
    await facilityMasterService.remove(editedItem.value.id)
    isDeleteDialogOpen.value = false
    showToast('Fasilitas berhasil dihapus')

    if (rows.value.length === 1 && page.value > 1)
      page.value -= 1

    await fetchFacilities()
  }
  catch (error) {
    console.error('[pages/facilities.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const onSearch = async () => {
  page.value = 1
  await fetchFacilities()
}

watch([page, perPage, sortBy, sortOrder], fetchFacilities)
onMounted(fetchFacilities)
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <span class="text-h6">Data Fasilitas</span>
          <VBtn v-if="canCreate" color="primary" prepend-icon="ri-add-line" @click="openCreateDialog">Tambah Fasilitas</VBtn>
        </div>
      </template>
    </VCardItem>

    <VCardText>
      <VRow>
        <VCol cols="12" md="5">
          <VTextField v-model="search" label="Cari fasilitas" placeholder="Nama atau deskripsi" prepend-inner-icon="ri-search-line" @keyup.enter="onSearch" />
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
          <VSelect v-model="perPage" label="Per halaman" :items="[10,20,50]" />
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
            <th>Biaya</th>
            <th>Deskripsi</th>
            <th>Status</th>
            <th>Diubah Pada</th>
            <th class="text-end">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!isLoading && rows.length===0">
            <td colspan="6" class="text-center text-medium-emphasis py-6">Data fasilitas belum ada.</td>
          </tr>
          <tr v-for="item in rows" :key="item.id">
            <td class="font-weight-medium">{{ item.name }}</td>
            <td>{{ item.cost ?? '-' }}</td>
            <td>{{ item.description || '-' }}</td>
            <td><VChip size="small" :color="item.status === 'ACTIVE' ? 'success' : 'warning'" label>{{ item.status || '-' }}</VChip></td>
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

  <VDialog v-model="isFormDialogOpen" max-width="640">
    <VCard>
      <VCardItem :title="isEditMode ? 'Ubah Fasilitas' : 'Tambah Fasilitas'" />
      <VCardText>
        <VForm @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12" md="6"><VTextField v-model="form.name" label="Nama" :rules="[v => !!v || 'Nama wajib diisi']" /></VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.cost"
                label="Biaya"
                type="number"
                min="0"
                step="0.01"
                inputmode="decimal"
                autocomplete="off"
                :rules="[v => v !== null && v !== '' || 'Biaya wajib diisi']"
                @keydown="blockKeysInvalidNumberMoneyInput"
              />
            </VCol>
            <VCol cols="12" md="6"><VSelect v-model="form.status" label="Status" :items="['ACTIVE','INACTIVE']" /></VCol>
            <VCol cols="12"><VTextarea v-model="form.description" label="Deskripsi" rows="2" /></VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isFormDialogOpen=false">Batal</VBtn>
        <VBtn color="primary" :loading="isSubmitting" :disabled="isSubmitting" @click="submitForm">Simpan</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDeleteDialogOpen" max-width="420">
    <VCard>
      <VCardItem title="Hapus Fasilitas" />
      <VCardText>Yakin hapus fasilitas <strong>{{ editedItem?.name }}</strong>?</VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isDeleteDialogOpen=false">Batal</VBtn>
        <VBtn color="error" :loading="isSubmitting" :disabled="isSubmitting" @click="confirmDelete">Hapus</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDetailDialogOpen" max-width="520">
    <VCard>
      <VCardItem title="Detail Fasilitas" />
      <VCardText>
        <VTable density="compact">
          <tbody>
            <tr><td>Nama</td><td class="text-end font-weight-medium">{{ detailItem?.name || '-' }}</td></tr>
            <tr><td>Biaya</td><td class="text-end">{{ detailItem?.cost ?? '-' }}</td></tr>
            <tr><td>Deskripsi</td><td class="text-end">{{ detailItem?.description || '-' }}</td></tr>
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



