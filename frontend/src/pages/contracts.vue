<script setup lang="ts">
import { ApiError } from '@/services/http'
import {
  clientMasterService,
  contractMasterService,
  type ClientItem,
  type ContractItem,
  type MasterStatus,
} from '@/services/masters'
import { useAuthStore } from '@/stores/auth'
import { optionalPhoneRule, sanitizePhoneNumber } from '@/utils/phone'
import {
  blockKeysNonDecimalMoney,
  parseOptionalApiDecimalMoney,
  sanitizeDecimalMoneyInput,
} from '@/utils/money-input'
import { formatRupiah, formatRupiahPlain } from '@/utils/currency'

type ContractForm = {
  contract_number: string
  client_id: string
  contract_period: string
  contact_person: string
  phone_number: string
  email: string
  address: string
  contract_value: string
  status: MasterStatus
}

const rows = ref<ContractItem[]>([])
const clients = ref<ClientItem[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortBy = ref<'created_at' | 'contract_number'>('created_at')
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
  client_id: '',
  contract_period: '',
  contact_person: '',
  phone_number: '',
  email: '',
  address: '',
  contract_value: '',
  status: 'ACTIVE',
})

const snackbar = ref({ show: false, color: 'success', text: '' })

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const isEditMode = computed(() => Boolean(editedItem.value))
const phoneRules = [optionalPhoneRule]

const clientOptions = computed(() => clients.value.map(client => ({
  title: client.code ? `${client.name} (${client.code})` : client.name,
  value: client.id,
})))

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
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value)) : '-'

/** Tampilan rupiah dari string DECIMAL API (mis. "3500000.00"). */
const formatMoneyId = (value?: string | null) => {
  return formatRupiah(value)
}
const formatMoneyTable = (value?: string | null) => formatRupiahPlain(value)

const onContractValueInput = (v: string) => {
  form.value.contract_value = sanitizeDecimalMoneyInput(String(v ?? ''))
}

const formatPeriod = (month?: number, year?: number) => {
  if (!month || !year)
    return '-'

  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

const fromPeriodToInputMonth = (month?: number, year?: number) => (month && year) ? `${year}-${month.toString().padStart(2, '0')}` : ''
const getPeriodPayload = (period: string) => {
  const [yearRaw, monthRaw] = period.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12)
    return null

  return { year, month }
}

const fetchClients = async () => {
  try {
    const response = await clientMasterService.list({
      page: 1,
      perPage: 200,
      sortBy: 'created_at',
      sortOrder: 'desc',
    })
    clients.value = response.data.filter(item => item.status === 'ACTIVE')
  }
  catch {
    clients.value = []
  }
}

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
  finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  editedItem.value = null
  form.value = {
    contract_number: '',
    client_id: '',
    contract_period: '',
    contact_person: '',
    phone_number: '',
    email: '',
    address: '',
    contract_value: '',
    status: 'ACTIVE',
  }
}

const openCreateDialog = () => {
  resetForm()
  isFormDialogOpen.value = true
}

const openEditDialog = (item: ContractItem) => {
  editedItem.value = item
  form.value = {
    contract_number: item.contract_number || '',
    client_id: item.client_id,
    contract_period: fromPeriodToInputMonth(item.contract_month, item.contract_year),
    contact_person: item.contact_person || '',
    phone_number: sanitizePhoneNumber(item.phone_number || ''),
    email: item.email || '',
    address: item.address || '',
    contract_value: item.contract_value ?? '',
    status: item.status || 'ACTIVE',
  }
  isFormDialogOpen.value = true
}

const submitForm = async () => {
  if (isSubmitting.value)
    return

  if (!form.value.client_id) {
    showToast('Client wajib dipilih', 'error')
    return
  }

  const periodPayload = getPeriodPayload(form.value.contract_period)
  if (!periodPayload) {
    showToast('Periode kontrak wajib diisi', 'error')
    return
  }

  const contractValuePayload = parseOptionalApiDecimalMoney(form.value.contract_value)
  if (contractValuePayload === '__invalid__') {
    showToast('Nilai kontrak tidak valid. Contoh: 3500000 atau 3500000.50 (maks. 13 digit bulat, 2 desimal).', 'error')
    return
  }

  isSubmitting.value = true

  const payload = {
    contract_number: form.value.contract_number.trim() || undefined,
    client_id: form.value.client_id,
    contract_month: periodPayload.month,
    contract_year: periodPayload.year,
    contact_person: form.value.contact_person.trim() || undefined,
    phone_number: sanitizePhoneNumber(form.value.phone_number) || undefined,
    email: form.value.email.trim() || undefined,
    address: form.value.address.trim() || undefined,
    ...(contractValuePayload !== undefined && { contract_value: contractValuePayload }),
    status: form.value.status,
  }

  try {
    if (editedItem.value) {
      await contractMasterService.update(editedItem.value.id, payload)
      showToast('Kontrak berhasil diperbarui')
    }
    else {
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
  finally {
    isSubmitting.value = false
  }
}

const onPhoneInput = () => {
  form.value.phone_number = sanitizePhoneNumber(form.value.phone_number)
}

const openDeleteDialog = (item: ContractItem) => {
  editedItem.value = item
  isDeleteDialogOpen.value = true
}

const openDetailDialog = (item: ContractItem) => {
  detailItem.value = item
  isDetailDialogOpen.value = true
}

const confirmDelete = async () => {
  if (!editedItem.value || isSubmitting.value)
    return

  isSubmitting.value = true
  try {
    await contractMasterService.remove(editedItem.value.id)
    isDeleteDialogOpen.value = false
    showToast('Kontrak berhasil dihapus')
    if (rows.value.length === 1 && page.value > 1)
      page.value -= 1
    await fetchContracts()
  }
  catch (error) {
    console.error('[pages/contracts.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const onSearch = async () => {
  page.value = 1
  await fetchContracts()
}

watch([page, perPage, sortBy, sortOrder], fetchContracts)
onMounted(async () => {
  await fetchClients()
  await fetchContracts()
})
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
        <VCol cols="12" md="5"><VTextField v-model="search" label="Cari kontrak" placeholder="Nomor / client / PIC / email / telepon" prepend-inner-icon="ri-search-line" @keyup.enter="onSearch" /></VCol>
        <VCol cols="12" md="2"><VBtn block class="mt-md-1" color="secondary" @click="onSearch">Cari</VBtn></VCol>
        <VCol cols="6" md="2"><VSelect v-model="sortBy" label="Urutkan" :items="[{ title: 'Dibuat', value: 'created_at' }, { title: 'No Kontrak', value: 'contract_number' }, ]" item-title="title" item-value="value" /></VCol>
        <VCol cols="6" md="1"><VSelect v-model="sortOrder" label="Urutan" :items="[{ title: 'DESC', value: 'desc' }, { title: 'ASC', value: 'asc' }]" item-title="title" item-value="value" /></VCol>
        <VCol cols="12" md="2"><VSelect v-model="perPage" label="Per halaman" :items="[10, 20, 50]" /></VCol>
      </VRow>
    </VCardText>
    <VDivider />
    <VCardText>
      <VProgressLinear v-if="isLoading" indeterminate color="primary" class="mb-4" />
      <VTable density="comfortable">
        <thead>
          <tr><th>No Kontrak</th><th>Client</th><th>Periode</th><th>Nilai Kontrak</th><th>PIC</th><th>Status</th><th>Dibuat Pada</th><th class="text-end">Aksi</th></tr>
        </thead>
        <tbody>
          <tr v-if="!isLoading && rows.length === 0"><td colspan="8" class="text-center text-medium-emphasis py-6">Data kontrak belum ada.</td></tr>
          <tr v-for="item in rows" :key="item.id">
            <td class="font-weight-medium">{{ item.contract_number || '-' }}</td>
            <td>{{ item.client?.name || '-' }}</td>
            <td>{{ formatPeriod(item.contract_month, item.contract_year) }}</td>
            <td class="text-end">{{ formatMoneyTable(item.contract_value) }}</td>
            <td>{{ item.contact_person || '-' }}</td>
            <td><VChip size="small" :color="item.status === 'ACTIVE' ? 'success' : 'warning'" label>{{ item.status || '-' }}</VChip></td>
            <td>{{ formatDate(item.created_at) }}</td>
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
      <VCardItem :title="isEditMode ? 'Ubah Kontrak' : 'Tambah Kontrak'" />
      <VCardText>
        <VForm @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12" md="4"><VTextField v-model="form.contract_number" label="Nomor Kontrak (Otomatis)" disabled readonly placeholder="Dibuat otomatis" /></VCol>
            <VCol cols="12" md="4"><VSelect v-model="form.client_id" label="Client" :items="clientOptions" item-title="title" item-value="value" /></VCol>
            <VCol cols="12" md="4"><VTextField v-model="form.contract_period" label="Periode Kontrak" type="month" /></VCol>
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
            <VCol cols="12" md="6">
              <VTextField
                :model-value="form.contract_value"
                label="Nilai kontrak (Rp)"
                placeholder="contoh: 3500000 atau 3500000.50"
                persistent-hint
                hint="Hanya angka; titik untuk desimal (maks. 13 digit bulat, 2 desimal)."
                inputmode="decimal"
                autocomplete="off"
                @update:model-value="onContractValueInput"
                @keydown="blockKeysNonDecimalMoney"
              />
            </VCol>
            <VCol cols="12"><VTextarea v-model="form.address" label="Alamat" rows="2" /></VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="justify-end"><VBtn variant="text" @click="isFormDialogOpen = false">Batal</VBtn><VBtn color="primary" :loading="isSubmitting" :disabled="isSubmitting" @click="submitForm">Simpan</VBtn></VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDeleteDialogOpen" max-width="420">
    <VCard><VCardItem title="Hapus Kontrak" /><VCardText>Yakin hapus kontrak <strong>{{ editedItem?.contract_number || '-' }}</strong>?</VCardText><VCardActions class="justify-end"><VBtn variant="text" @click="isDeleteDialogOpen = false">Batal</VBtn><VBtn color="error" :loading="isSubmitting" :disabled="isSubmitting" @click="confirmDelete">Hapus</VBtn></VCardActions></VCard>
  </VDialog>

  <VDialog v-model="isDetailDialogOpen" max-width="620">
    <VCard>
      <VCardItem title="Detail Kontrak" />
      <VCardText>
        <VRow>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Nomor Kontrak</div>
                <div class="text-body-1 font-weight-medium text-break">{{ detailItem?.contract_number || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Client</div>
                <div class="text-body-1 text-break">{{ detailItem?.client?.name || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Periode</div>
                <div class="text-body-1 text-break">{{ formatPeriod(detailItem?.contract_month, detailItem?.contract_year) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Nilai Kontrak</div>
                <div class="text-body-1 text-break">{{ detailItem ? formatMoneyId(detailItem.contract_value) : '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">PIC</div>
                <div class="text-body-1 text-break">{{ detailItem?.contact_person || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Telepon</div>
                <div class="text-body-1 text-break">{{ detailItem?.phone_number || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Email</div>
                <div class="text-body-1 text-break">{{ detailItem?.email || '-' }}</div>
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
        <VBtn variant="text" @click="isDetailDialogOpen = false">Tutup</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="2500">{{ snackbar.text }}</VSnackbar>
</template>

