<script setup lang="ts">
import { ApiError } from '@/services/http'
import { clientMasterService, type ClientItem, type MasterStatus } from '@/services/masters'
import { useAuthStore } from '@/stores/auth'
import { optionalPhoneRule, sanitizePhoneNumber } from '@/utils/phone'

type ClientForm = {
  name: string
  code: string
  contact_person: string
  phone_number: string
  email: string
  address: string
  status: MasterStatus
}

const rows = ref<ClientItem[]>([])
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
const editedItem = ref<ClientItem | null>(null)
const detailItem = ref<ClientItem | null>(null)
const authStore = useAuthStore()

const canCreate = computed(() => authStore.hasPermission('client:create'))
const canUpdate = computed(() => authStore.hasPermission('client:update'))
const canDelete = computed(() => authStore.hasPermission('client:delete'))
const canDetail = computed(() => authStore.hasPermission('client:detail'))

const form = ref<ClientForm>({
  name: '',
  code: '',
  contact_person: '',
  phone_number: '',
  email: '',
  address: '',
  status: 'ACTIVE',
})

const snackbar = ref({ show: false, color: 'success', text: '' })

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const isEditMode = computed(() => Boolean(editedItem.value))
const phoneRules = [optionalPhoneRule]
const showToast = (text: string, color: 'success' | 'error' = 'success') => { snackbar.value = { show: true, color, text } }
const getErrorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'Terjadi kesalahan. Silakan coba lagi.'
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value)) : '-'

const fetchClients = async () => {
  isLoading.value = true
  try {
    const response = await clientMasterService.list({
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
    console.error('[pages/clients.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally { isLoading.value = false }
}

const resetForm = () => {
  editedItem.value = null
  form.value = {
    name: '',
    code: '',
    contact_person: '',
    phone_number: '',
    email: '',
    address: '',
    status: 'ACTIVE',
  }
}

const openCreateDialog = () => { resetForm(); isFormDialogOpen.value = true }
const openEditDialog = (item: ClientItem) => {
  editedItem.value = item
  form.value = {
    name: item.name || '',
    code: item.code || '',
    contact_person: item.contact_person || '',
    phone_number: sanitizePhoneNumber(item.phone_number || ''),
    email: item.email || '',
    address: item.address || '',
    status: item.status || 'ACTIVE',
  }
  isFormDialogOpen.value = true
}

const submitForm = async () => {
  if (isSubmitting.value)
    return

  if (!form.value.name.trim()) {
    showToast('Nama client wajib diisi', 'error')
    return
  }

  isSubmitting.value = true

  const payload = {
    name: form.value.name.trim(),
    code: form.value.code.trim() || undefined,
    contact_person: form.value.contact_person.trim() || undefined,
    phone_number: sanitizePhoneNumber(form.value.phone_number) || undefined,
    email: form.value.email.trim() || undefined,
    address: form.value.address.trim() || undefined,
    status: form.value.status,
  }

  try {
    if (editedItem.value) {
      await clientMasterService.update(editedItem.value.id, payload)
      showToast('Client berhasil diperbarui')
    }
    else {
      await clientMasterService.create(payload)
      showToast('Client berhasil dibuat')
      page.value = 1
    }
    isFormDialogOpen.value = false
    await fetchClients()
  }
  catch (error) {
    console.error('[pages/clients.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally { isSubmitting.value = false }
}

const onPhoneInput = () => {
  form.value.phone_number = sanitizePhoneNumber(form.value.phone_number)
}

const openDeleteDialog = (item: ClientItem) => { editedItem.value = item; isDeleteDialogOpen.value = true }
const openDetailDialog = (item: ClientItem) => { detailItem.value = item; isDetailDialogOpen.value = true }
const confirmDelete = async () => {
  if (!editedItem.value || isSubmitting.value)
    return

  isSubmitting.value = true
  try {
    await clientMasterService.remove(editedItem.value.id)
    isDeleteDialogOpen.value = false
    showToast('Client berhasil dihapus')
    if (rows.value.length === 1 && page.value > 1)
      page.value -= 1
    await fetchClients()
  }
  catch (error) {
    console.error('[pages/clients.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally { isSubmitting.value = false }
}

const onSearch = async () => { page.value = 1; await fetchClients() }
watch([page, perPage, sortBy, sortOrder], fetchClients)
onMounted(fetchClients)
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <span class="text-h6">Data Clients</span>
          <VBtn v-if="canCreate" color="primary" prepend-icon="ri-add-line" @click="openCreateDialog">Tambah Client</VBtn>
        </div>
      </template>
    </VCardItem>
    <VCardText>
      <VRow>
        <VCol cols="12" md="5"><VTextField v-model="search" label="Cari client" placeholder="Nama / kode / PIC / email / telepon" prepend-inner-icon="ri-search-line" @keyup.enter="onSearch" /></VCol>
        <VCol cols="12" md="2"><VBtn block class="mt-md-1" color="secondary" @click="onSearch">Cari</VBtn></VCol>
        <VCol cols="6" md="2"><VSelect v-model="sortBy" label="Urutkan" :items="[{ title: 'Dibuat', value: 'created_at' }, { title: 'Nama', value: 'name' }, { title: 'Diubah', value: 'updated_at' }]" item-title="title" item-value="value" /></VCol>
        <VCol cols="6" md="1"><VSelect v-model="sortOrder" label="Urutan" :items="[{ title: 'DESC', value: 'desc' }, { title: 'ASC', value: 'asc' }]" item-title="title" item-value="value" /></VCol>
        <VCol cols="12" md="2"><VSelect v-model="perPage" label="Per halaman" :items="[10, 20, 50]" /></VCol>
      </VRow>
    </VCardText>
    <VDivider />
    <VCardText>
      <VProgressLinear v-if="isLoading" indeterminate color="primary" class="mb-4" />
      <VTable density="comfortable">
        <thead>
          <tr><th>Nama</th><th>Kode</th><th>PIC</th><th>Telepon</th><th>Status</th><th>Diubah Pada</th><th class="text-end">Aksi</th></tr>
        </thead>
        <tbody>
          <tr v-if="!isLoading && rows.length === 0"><td colspan="7" class="text-center text-medium-emphasis py-6">Data client belum ada.</td></tr>
          <tr v-for="item in rows" :key="item.id">
            <td class="font-weight-medium">{{ item.name }}</td>
            <td>{{ item.code || '-' }}</td>
            <td>{{ item.contact_person || '-' }}</td>
            <td>{{ item.phone_number || '-' }}</td>
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
      <div class="d-flex justify-space-between align-center mt-4 flex-wrap gap-4"><span class="text-sm text-medium-emphasis">Total: {{ total }} data</span><VPagination v-model="page" :length="totalPages" :total-visible="7" /></div>
    </VCardText>
  </VCard>

  <VDialog v-model="isFormDialogOpen" max-width="760">
    <VCard>
      <VCardItem :title="isEditMode ? 'Ubah Client' : 'Tambah Client'" />
      <VCardText>
        <VForm @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12" md="6"><VTextField v-model="form.name" label="Nama Client" /></VCol>
            <VCol cols="12" md="6"><VTextField v-model="form.code" label="Kode Client" /></VCol>
            <VCol cols="12" md="6"><VTextField v-model="form.contact_person" label="PIC" /></VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.phone_number"
                label="No. Telepon"
                type="tel"
                inputmode="numeric"
                :maxlength="15"
                :rules="phoneRules"
                @update:model-value="onPhoneInput"
              />
            </VCol>
            <VCol cols="12" md="6"><VTextField v-model="form.email" label="Email" type="email" /></VCol>
            <VCol cols="12" md="6"><VSelect v-model="form.status" label="Status" :items="['ACTIVE', 'INACTIVE']" /></VCol>
            <VCol cols="12"><VTextarea v-model="form.address" label="Alamat" rows="2" /></VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="justify-end"><VBtn variant="text" @click="isFormDialogOpen = false">Batal</VBtn><VBtn color="primary" :loading="isSubmitting" :disabled="isSubmitting" @click="submitForm">Simpan</VBtn></VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDeleteDialogOpen" max-width="420">
    <VCard><VCardItem title="Hapus Client" /><VCardText>Yakin hapus client <strong>{{ editedItem?.name || '-' }}</strong>?</VCardText><VCardActions class="justify-end"><VBtn variant="text" @click="isDeleteDialogOpen = false">Batal</VBtn><VBtn color="error" :loading="isSubmitting" :disabled="isSubmitting" @click="confirmDelete">Hapus</VBtn></VCardActions></VCard>
  </VDialog>

  <VDialog v-model="isDetailDialogOpen" max-width="620">
    <VCard>
      <VCardItem title="Detail Client" />
      <VCardText>
        <VTable density="compact">
          <tbody>
            <tr><td>Nama</td><td class="text-end font-weight-medium">{{ detailItem?.name || '-' }}</td></tr>
            <tr><td>Kode</td><td class="text-end">{{ detailItem?.code || '-' }}</td></tr>
            <tr><td>PIC</td><td class="text-end">{{ detailItem?.contact_person || '-' }}</td></tr>
            <tr><td>Telepon</td><td class="text-end">{{ detailItem?.phone_number || '-' }}</td></tr>
            <tr><td>Email</td><td class="text-end">{{ detailItem?.email || '-' }}</td></tr>
            <tr><td>Alamat</td><td class="text-end">{{ detailItem?.address || '-' }}</td></tr>
            <tr><td>Status</td><td class="text-end">{{ detailItem?.status || '-' }}</td></tr>
            <tr><td>Dibuat</td><td class="text-end">{{ detailItem ? formatDate(detailItem.created_at) : '-' }}</td></tr>
            <tr><td>Diubah</td><td class="text-end">{{ detailItem ? formatDate(detailItem.updated_at) : '-' }}</td></tr>
          </tbody>
        </VTable>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isDetailDialogOpen = false">Tutup</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="2500">{{ snackbar.text }}</VSnackbar>
</template>
