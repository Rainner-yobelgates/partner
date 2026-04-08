<script setup lang="ts">
import { ApiError } from '@/services/http'
import { contractMasterService, type ContractItem, type MasterStatus } from '@/services/masters'
import { useAuthStore } from '@/stores/auth'
import { optionalPhoneRule, sanitizePhoneNumber } from '@/utils/phone'

type ContractForm = {
  contract_number: string
  contact_person: string
  phone_number: string
  email: string
  address: string
  start_date: string
  end_date: string
  status: MasterStatus
}

const rows = ref<ContractItem[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortBy = ref<'created_at' | 'contract_number' | 'updated_at'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const isLoading = ref(false)
const isSubmitting = ref(false)
const isFormDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isDetailDialogOpen = ref(false)
const editedItem = ref<ContractItem | null>(null)
const detailItem = ref<ContractItem | null>(null)
const authStore = useAuthStore()

const canCreate = computed(() => authStore.hasPermission('contract:create'))
const canUpdate = computed(() => authStore.hasPermission('contract:update'))
const canDelete = computed(() => authStore.hasPermission('contract:delete'))
const canDetail = computed(() => authStore.hasPermission('contract:detail'))

const form = ref<ContractForm>({
  contract_number: '',
  contact_person: '',
  phone_number: '',
  email: '',
  address: '',
  start_date: '',
  end_date: '',
  status: 'ACTIVE',
})

const snackbar = ref({ show: false, color: 'success', text: '' })

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const isEditMode = computed(() => Boolean(editedItem.value))
const phoneRules = [optionalPhoneRule]
const showToast = (text: string, color: 'success' | 'error' = 'success') => { snackbar.value = { show: true, color, text } }
const getErrorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'Terjadi kesalahan. Silakan coba lagi.'
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value)) : '-'

const toIsoDate = (value: string) => value ? new Date(value).toISOString() : undefined
const fromIsoToInputDate = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : ''

const fetchContracts = async () => {
  isLoading.value = true
  try {
    const response = await contractMasterService.list({
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
    console.error('[pages/contracts.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally { isLoading.value = false }
}

const resetForm = () => {
  editedItem.value = null
  form.value = {
    contract_number: '', contact_person: '', phone_number: '', email: '', address: '', start_date: '', end_date: '', status: 'ACTIVE',
  }
}

const openCreateDialog = () => { resetForm(); isFormDialogOpen.value = true }
const openEditDialog = (item: ContractItem) => {
  editedItem.value = item
  form.value = {
    contract_number: item.contract_number || '',
    contact_person: item.contact_person || '',
    phone_number: sanitizePhoneNumber(item.phone_number || ''),
    email: item.email || '',
    address: item.address || '',
    start_date: fromIsoToInputDate(item.start_date),
    end_date: fromIsoToInputDate(item.end_date),
    status: item.status || 'ACTIVE',
  }
  isFormDialogOpen.value = true
}

const submitForm = async () => {
  if (isSubmitting.value) return
  isSubmitting.value = true

  const payload = {
    contract_number: form.value.contract_number.trim() || undefined,
    contact_person: form.value.contact_person.trim() || undefined,
    phone_number: sanitizePhoneNumber(form.value.phone_number) || undefined,
    email: form.value.email.trim() || undefined,
    address: form.value.address.trim() || undefined,
    start_date: toIsoDate(form.value.start_date),
    end_date: toIsoDate(form.value.end_date),
    status: form.value.status,
  }

  try {
    if (editedItem.value) {
      await contractMasterService.update(editedItem.value.id, payload)
      showToast('Kontrak berhasil diperbarui')
    } else {
      await contractMasterService.create(payload)
      showToast('Kontrak berhasil dibuat')
      page.value = 1
    }
    isFormDialogOpen.value = false
    await fetchContracts()
  }
  catch (error) {
    console.error('[pages/contracts.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally { isSubmitting.value = false }
}

const onPhoneInput = () => {
  form.value.phone_number = sanitizePhoneNumber(form.value.phone_number)
}

const openDeleteDialog = (item: ContractItem) => { editedItem.value = item; isDeleteDialogOpen.value = true }
const openDetailDialog = (item: ContractItem) => { detailItem.value = item; isDetailDialogOpen.value = true }
const confirmDelete = async () => {
  if (!editedItem.value || isSubmitting.value) return
  isSubmitting.value = true
  try {
    await contractMasterService.remove(editedItem.value.id)
    isDeleteDialogOpen.value = false
    showToast('Kontrak berhasil dihapus')
    if (rows.value.length === 1 && page.value > 1) page.value -= 1
    await fetchContracts()
  }
  catch (error) {
    console.error('[pages/contracts.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally { isSubmitting.value = false }
}

const onSearch = async () => { page.value = 1; await fetchContracts() }
watch([page, perPage, sortBy, sortOrder], fetchContracts)
onMounted(fetchContracts)
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <span class="text-h6">Data Kontrak</span>
          <VBtn v-if="canCreate" color="primary" prepend-icon="ri-add-line" @click="openCreateDialog">Tambah Kontrak</VBtn>
        </div>
      </template>
    </VCardItem>
    <VCardText>
      <VRow>
        <VCol cols="12" md="5"><VTextField v-model="search" label="Cari kontrak" placeholder="Nomor / PIC / email / telepon" prepend-inner-icon="ri-search-line" @keyup.enter="onSearch" /></VCol>
        <VCol cols="12" md="2"><VBtn block class="mt-md-1" color="secondary" @click="onSearch">Cari</VBtn></VCol>
        <VCol cols="6" md="2"><VSelect v-model="sortBy" label="Urutkan" :items="[{ title:'Dibuat', value:'created_at'},{ title:'No Kontrak', value:'contract_number'},{ title:'Diubah', value:'updated_at'}]" item-title="title" item-value="value" /></VCol>
        <VCol cols="6" md="1"><VSelect v-model="sortOrder" label="Urutan" :items="[{ title:'DESC', value:'desc'},{ title:'ASC', value:'asc'}]" item-title="title" item-value="value" /></VCol>
        <VCol cols="12" md="2"><VSelect v-model="perPage" label="Per halaman" :items="[10,20,50]" /></VCol>
      </VRow>
    </VCardText>
    <VDivider />
    <VCardText>
      <VProgressLinear v-if="isLoading" indeterminate color="primary" class="mb-4" />
      <VTable density="comfortable">
        <thead>
          <tr><th>No Kontrak</th><th>PIC</th><th>Email</th><th>Periode</th><th>Status</th><th>Diubah Pada</th><th class="text-end">Aksi</th></tr>
        </thead>
        <tbody>
          <tr v-if="!isLoading && rows.length===0"><td colspan="7" class="text-center text-medium-emphasis py-6">Data kontrak belum ada.</td></tr>
          <tr v-for="item in rows" :key="item.id">
            <td class="font-weight-medium">{{ item.contract_number || '-' }}</td>
            <td>{{ item.contact_person || '-' }}</td>
            <td>{{ item.email || '-' }}</td>
            <td>{{ formatDate(item.start_date) }} - {{ formatDate(item.end_date) }}</td>
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

  <VDialog v-model="isFormDialogOpen" max-width="800">
    <VCard>
      <VCardItem :title="isEditMode ? 'Ubah Kontrak' : 'Tambah Kontrak'" />
      <VCardText>
        <VForm @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12" md="6"><VTextField v-model="form.contract_number" label="Nomor Kontrak (Otomatis)" readonly placeholder="Dibuat otomatis" /></VCol>
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
            <VCol cols="12" md="6"><VTextField v-model="form.start_date" label="Tanggal Mulai" type="date" /></VCol>
            <VCol cols="12" md="6"><VTextField v-model="form.end_date" label="Tanggal Selesai" type="date" /></VCol>
            <VCol cols="12" md="6"><VSelect v-model="form.status" label="Status" :items="['ACTIVE','INACTIVE']" /></VCol>
            <VCol cols="12"><VTextarea v-model="form.address" label="Alamat" rows="2" /></VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="justify-end"><VBtn variant="text" @click="isFormDialogOpen=false">Batal</VBtn><VBtn color="primary" :loading="isSubmitting" :disabled="isSubmitting" @click="submitForm">Simpan</VBtn></VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDeleteDialogOpen" max-width="420">
    <VCard><VCardItem title="Hapus Kontrak" /><VCardText>Yakin hapus kontrak <strong>{{ editedItem?.contract_number || '-' }}</strong>?</VCardText><VCardActions class="justify-end"><VBtn variant="text" @click="isDeleteDialogOpen=false">Batal</VBtn><VBtn color="error" :loading="isSubmitting" :disabled="isSubmitting" @click="confirmDelete">Hapus</VBtn></VCardActions></VCard>
  </VDialog>

  <VDialog v-model="isDetailDialogOpen" max-width="620">
    <VCard>
      <VCardItem title="Detail Kontrak" />
      <VCardText>
        <VTable density="compact">
          <tbody>
            <tr><td>Nomor Kontrak</td><td class="text-end font-weight-medium">{{ detailItem?.contract_number || '-' }}</td></tr>
            <tr><td>PIC</td><td class="text-end">{{ detailItem?.contact_person || '-' }}</td></tr>
            <tr><td>Telepon</td><td class="text-end">{{ detailItem?.phone_number || '-' }}</td></tr>
            <tr><td>Email</td><td class="text-end">{{ detailItem?.email || '-' }}</td></tr>
            <tr><td>Alamat</td><td class="text-end">{{ detailItem?.address || '-' }}</td></tr>
            <tr><td>Mulai</td><td class="text-end">{{ detailItem ? formatDate(detailItem.start_date) : '-' }}</td></tr>
            <tr><td>Selesai</td><td class="text-end">{{ detailItem ? formatDate(detailItem.end_date) : '-' }}</td></tr>
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


