<script setup lang="ts">
import { ApiError } from '@/services/http'
import { tripSheetService, type TripSheetItem } from '@/services/trip-sheets'
import { driverMasterService, type DriverItem, type MasterStatus } from '@/services/masters'
import { useAuthStore } from '@/stores/auth'
import {
  blockKeysNonDecimalMoney,
  onPasteSanitizedDecimalMoney,
  parseOptionalApiDecimalMoney,
  sanitizeDecimalMoneyInput,
} from '@/utils/money-input'

type TripSheetForm = {
  order_vehicle_id: string
  driver_id: string
  assistant_id: string
  fuel_cost: string
  toll_fee: string
  parking_fee: string
  stay_cost: string
  others: string
  expense_notes: string
  status: MasterStatus
}

type MoneyField = 'fuel_cost' | 'toll_fee' | 'parking_fee' | 'stay_cost' | 'others'
type ParsedMoneyPayload = Partial<Record<MoneyField, string>>

const authStore = useAuthStore()
const canUpdate = computed(() => authStore.hasPermission('trip_sheet:update'))
const canDetail = computed(() => authStore.hasPermission('trip_sheet:detail'))

const rows = ref<TripSheetItem[]>([])
const drivers = ref<DriverItem[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortBy = ref<'created_at' | 'updated_at'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const isLoading = ref(false)
const isDriverOptionsLoading = ref(false)
const isSubmitting = ref(false)
const isFormDialogOpen = ref(false)
const isDetailDialogOpen = ref(false)
const isImagePreviewDialogOpen = ref(false)
const editedItem = ref<TripSheetItem | null>(null)
const detailItem = ref<TripSheetItem | null>(null)
const selectedPreviewImage = ref('')
const attachments = ref<File[]>([])
const existingAttachments = ref<string[]>([])
const maxAttachmentSizeMb = 5
const maxAttachmentCount = 15

const fromMoneyResponse = (value: string | number | null | undefined) => {
  if (value == null)
    return ''
  const s = String(value).trim()
  return s === '' ? '' : s
}

const form = ref<TripSheetForm>({
  order_vehicle_id: '',
  driver_id: '',
  assistant_id: '',
  fuel_cost: '',
  toll_fee: '',
  parking_fee: '',
  stay_cost: '',
  others: '',
  expense_notes: '',
  status: 'ACTIVE',
})

const snackbar = ref({ show: false, color: 'success', text: '' })
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const baseDriverOptions = computed(() =>
  drivers.value
    .filter(driver => driver.status === 'ACTIVE')
    .map(driver => ({
      title: driver.type ? `${driver.name} (${driver.type})` : driver.name,
      value: driver.id,
    })),
)

const appendSelectedOption = (
  options: { title: string; value: string }[],
  selectedId: string,
  fallbackName?: string | null,
) => {
  if (!selectedId || options.some(option => option.value === selectedId))
    return options

  return [
    ...options,
    { title: fallbackName || `Driver #${selectedId}`, value: selectedId },
  ]
}

const driverOptions = computed(() =>
  appendSelectedOption(baseDriverOptions.value, form.value.driver_id, editedItem.value?.driver?.name),
)

const assistantOptions = computed(() =>
  appendSelectedOption(baseDriverOptions.value, form.value.assistant_id, editedItem.value?.assistant?.name),
)

const showToast = (text: string, color: 'success' | 'error' = 'success') => {
  snackbar.value = { show: true, color, text }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError)
    return error.message

  return 'Terjadi kesalahan. Silakan coba lagi.'
}

const formatDate = (value?: string | null) => {
  if (!value)
    return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const parseAttachmentValue = (value?: string | null) => {
  if (!value)
    return []

  const trimmed = value.trim()
  if (!trimmed)
    return []

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed))
      return parsed.filter((item) => typeof item === 'string' && item.trim())
  }
  catch (error) {
    console.error('[pages/trip-sheets.vue]', error)
    return [trimmed]
  }

  return [trimmed]
}

const onMoneyFieldInput = (field: MoneyField, value: string) => {
  form.value[field] = sanitizeDecimalMoneyInput(String(value ?? ''))
}

const onMoneyFieldPaste = (field: MoneyField, event: ClipboardEvent) => {
  onPasteSanitizedDecimalMoney(event, (sanitized) => {
    form.value[field] = sanitized
  })
}

const moneyFieldRule = (value: string) => {
  const parsed = parseOptionalApiDecimalMoney(String(value ?? ''))
  return parsed !== '__invalid__' || 'Format uang tidak valid (maks 13 digit bulat, 2 digit desimal).'
}

const parseMoneyPayload = (): ParsedMoneyPayload | null => {
  const parsedFuel = parseOptionalApiDecimalMoney(form.value.fuel_cost)
  const parsedToll = parseOptionalApiDecimalMoney(form.value.toll_fee)
  const parsedParking = parseOptionalApiDecimalMoney(form.value.parking_fee)
  const parsedStay = parseOptionalApiDecimalMoney(form.value.stay_cost)
  const parsedOthers = parseOptionalApiDecimalMoney(form.value.others)

  if (
    parsedFuel === '__invalid__'
    || parsedToll === '__invalid__'
    || parsedParking === '__invalid__'
    || parsedStay === '__invalid__'
    || parsedOthers === '__invalid__'
  ) {
    showToast('Nilai uang tidak valid. Gunakan desimal non-negatif (maks 13 digit bulat, 2 digit desimal).', 'error')
    return null
  }

  return {
    ...(parsedFuel !== undefined && { fuel_cost: parsedFuel }),
    ...(parsedToll !== undefined && { toll_fee: parsedToll }),
    ...(parsedParking !== undefined && { parking_fee: parsedParking }),
    ...(parsedStay !== undefined && { stay_cost: parsedStay }),
    ...(parsedOthers !== undefined && { others: parsedOthers }),
  }
}

const buildFormData = (moneyPayload: ParsedMoneyPayload) => {
  const data = new FormData()
  const existing = existingAttachments.value.filter((item) => item && item.trim())

  data.append('order_vehicle_id', form.value.order_vehicle_id.trim())

  if (form.value.driver_id.trim())
    data.append('driver_id', form.value.driver_id.trim())

  if (form.value.assistant_id.trim())
    data.append('assistant_id', form.value.assistant_id.trim())

  if (moneyPayload.fuel_cost !== undefined)
    data.append('fuel_cost', moneyPayload.fuel_cost)

  if (moneyPayload.toll_fee !== undefined)
    data.append('toll_fee', moneyPayload.toll_fee)

  if (moneyPayload.parking_fee !== undefined)
    data.append('parking_fee', moneyPayload.parking_fee)

  if (moneyPayload.stay_cost !== undefined)
    data.append('stay_cost', moneyPayload.stay_cost)

  if (moneyPayload.others !== undefined)
    data.append('others', moneyPayload.others)

  if (form.value.expense_notes.trim())
    data.append('expense_notes', form.value.expense_notes.trim())

  data.append('attachment', JSON.stringify(existing))

  if (form.value.status)
    data.append('status', form.value.status)

  attachments.value.forEach((file) => {
    data.append('attachments', file)
  })

  return data
}

const removeExistingAttachment = (index: number) => {
  existingAttachments.value.splice(index, 1)
}

const removeNewAttachment = (index: number) => {
  attachments.value.splice(index, 1)
}

const clearNewAttachments = () => {
  attachments.value = []
}

const detailAttachmentList = computed(() => parseAttachmentValue(detailItem.value?.attachment))

const openDetailImagePreview = (url: string) => {
  selectedPreviewImage.value = url
  isImagePreviewDialogOpen.value = true
}

const validateAttachments = () => {
  if (attachments.value.length > maxAttachmentCount) {
    showToast(`Maksimal ${maxAttachmentCount} file lampiran.`, 'error')
    return false
  }

  const maxBytes = maxAttachmentSizeMb * 1024 * 1024
  const oversized = attachments.value.find(file => file.size > maxBytes)
  if (oversized) {
    showToast(`Ukuran ${oversized.name} melebihi ${maxAttachmentSizeMb}MB.`, 'error')
    return false
  }

  return true
}

const fetchTripSheets = async () => {
  isLoading.value = true
  try {
    const response = await tripSheetService.list({
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
    console.error('[pages/trip-sheets.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isLoading.value = false
  }
}

const fetchDriverOptions = async () => {
  isDriverOptionsLoading.value = true

  try {
    const response = await driverMasterService.list({
      page: 1,
      perPage: 200,
      sortBy: 'created_at',
      sortOrder: 'desc',
    })
    drivers.value = response.data
  }
  catch (error) {
    console.error('[pages/trip-sheets.vue]', error)
  }
  finally {
    isDriverOptionsLoading.value = false
  }
}

const openEditDialog = (item: TripSheetItem) => {
  editedItem.value = item
  attachments.value = []
  existingAttachments.value = parseAttachmentValue(item.attachment)
  form.value = {
    order_vehicle_id: item.order_vehicle_id || '',
    driver_id: item.driver_id || '',
    assistant_id: item.assistant_id || '',
    fuel_cost: fromMoneyResponse(item.fuel_cost),
    toll_fee: fromMoneyResponse(item.toll_fee),
    parking_fee: fromMoneyResponse(item.parking_fee),
    stay_cost: fromMoneyResponse(item.stay_cost),
    others: fromMoneyResponse(item.others),
    expense_notes: item.expense_notes || '',
    status: item.status || 'ACTIVE',
  }
  isFormDialogOpen.value = true
}

const submitForm = async () => {
  if (isSubmitting.value)
    return

  if (!form.value.order_vehicle_id.trim()) {
    showToast('Order vehicle wajib diisi', 'error')
    return
  }

  if (!validateAttachments())
    return

  const moneyPayload = parseMoneyPayload()
  if (!moneyPayload)
    return

  isSubmitting.value = true

  const payload = buildFormData(moneyPayload)

  try {
    if (!editedItem.value) {
      showToast('Surat jalan tidak ditemukan untuk diperbarui', 'error')
      isSubmitting.value = false
      return
    }

    await tripSheetService.update(editedItem.value.id, payload)
    showToast('Surat jalan berhasil diperbarui')

    isFormDialogOpen.value = false
    await fetchTripSheets()
  }
  catch (error) {
    console.error('[pages/trip-sheets.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const openDetailDialog = (item: TripSheetItem) => {
  detailItem.value = item
  isDetailDialogOpen.value = true
}

const onSearch = async () => {
  page.value = 1
  await fetchTripSheets()
}

watch([page, perPage, sortBy, sortOrder], fetchTripSheets)
onMounted(async () => {
  await Promise.all([
    fetchTripSheets(),
    fetchDriverOptions(),
  ])
})
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <span class="text-h6">Data Surat Jalan</span>
        </div>
      </template>
    </VCardItem>

    <VCardText>
      <VRow>
        <VCol cols="12" md="5">
          <VTextField v-model="search" label="Cari surat jalan" placeholder="Tujuan / catatan" prepend-inner-icon="ri-search-line" @keyup.enter="onSearch" />
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
            <th>Order</th>
            <th>Kendaraan</th>
            <th>Driver</th>
            <th>Tujuan</th>
            <th>Status</th>
            <th>Diubah Pada</th>
            <th class="text-end">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!isLoading && rows.length === 0">
            <td colspan="7" class="text-center text-medium-emphasis py-6">Data surat jalan belum ada.</td>
          </tr>
          <tr v-for="item in rows" :key="item.id">
            <td class="font-weight-medium">{{ item.orderVehicle?.order?.order_number || '-' }}</td>
            <td>{{ item.orderVehicle?.vehicle?.plate_number || '-' }}</td>
            <td>{{ item.driver?.name || '-' }}</td>
            <td>{{ item.destination || '-' }}</td>
            <td><VChip size="small" :color="item.status === 'ACTIVE' ? 'success' : 'warning'" label>{{ item.status || '-' }}</VChip></td>
            <td>{{ formatDate(item.updated_at) }}</td>
            <td class="text-end">
              <VBtn v-if="canDetail" size="small" variant="text" color="secondary" @click="openDetailDialog(item)">Detail</VBtn>
              <VBtn v-if="canUpdate" size="small" variant="text" color="primary" @click="openEditDialog(item)">Ubah</VBtn>
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

  <VDialog v-model="isFormDialogOpen" max-width="960">
    <VCard>
      <VCardItem title="Ubah Surat Jalan" />
      <VCardText>
        <VForm @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12" md="4"><VTextField v-model="form.order_vehicle_id" label="Order Vehicle ID" :rules="[v => !!v || 'Wajib diisi']" /></VCol>
            <VCol cols="12" md="4">
              <VSelect
                v-model="form.driver_id"
                label="Driver"
                :items="driverOptions"
                item-title="title"
                item-value="value"
                :loading="isDriverOptionsLoading"
                clearable
              />
            </VCol>
            <VCol cols="12" md="4">
              <VSelect
                v-model="form.assistant_id"
                label="Assistant"
                :items="assistantOptions"
                item-title="title"
                item-value="value"
                :loading="isDriverOptionsLoading"
                clearable
              />
            </VCol>
            <VCol cols="12" md="6"><VTextField :model-value="editedItem?.destination || editedItem?.orderVehicle?.order?.destination || editedItem?.orderVehicle?.order?.dropoff_location || '-'" label="Tujuan (dari Order)" readonly /></VCol>
            <VCol cols="12" md="6"><VSelect v-model="form.status" label="Status" :items="['ACTIVE','INACTIVE']" /></VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="form.fuel_cost"
                label="Biaya BBM"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                :rules="[moneyFieldRule]"
                @update:model-value="onMoneyFieldInput('fuel_cost', String($event ?? ''))"
                @keydown="blockKeysNonDecimalMoney"
                @paste="onMoneyFieldPaste('fuel_cost', $event)"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="form.toll_fee"
                label="Biaya Tol"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                :rules="[moneyFieldRule]"
                @update:model-value="onMoneyFieldInput('toll_fee', String($event ?? ''))"
                @keydown="blockKeysNonDecimalMoney"
                @paste="onMoneyFieldPaste('toll_fee', $event)"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="form.parking_fee"
                label="Biaya Parkir"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                :rules="[moneyFieldRule]"
                @update:model-value="onMoneyFieldInput('parking_fee', String($event ?? ''))"
                @keydown="blockKeysNonDecimalMoney"
                @paste="onMoneyFieldPaste('parking_fee', $event)"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="form.stay_cost"
                label="Biaya Inap"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                :rules="[moneyFieldRule]"
                @update:model-value="onMoneyFieldInput('stay_cost', String($event ?? ''))"
                @keydown="blockKeysNonDecimalMoney"
                @paste="onMoneyFieldPaste('stay_cost', $event)"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="form.others"
                label="Biaya lain-lain"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                :rules="[moneyFieldRule]"
                @update:model-value="onMoneyFieldInput('others', String($event ?? ''))"
                @keydown="blockKeysNonDecimalMoney"
                @paste="onMoneyFieldPaste('others', $event)"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VFileInput
                v-model="attachments"
                label="Lampiran Foto"
                accept="image/*"
                multiple
                counter
                show-size
                prepend-icon="ri-image-add-line"
                :hint="`Bisa pilih banyak file. Maks ${maxAttachmentCount} file, ${maxAttachmentSizeMb}MB per file.`"
                persistent-hint
              />
              <div v-if="attachments.length" class="d-flex align-center justify-space-between mt-2">
                <span class="text-caption text-medium-emphasis">File baru: {{ attachments.length }} / {{ maxAttachmentCount }}</span>
                <VBtn size="x-small" variant="text" color="secondary" @click="clearNewAttachments">Hapus semua</VBtn>
              </div>
              <div v-if="attachments.length" class="d-flex flex-wrap gap-2 mt-2">
                <VChip
                  v-for="(file, index) in attachments"
                  :key="`new-${index}`"
                  closable
                  @click:close="removeNewAttachment(index)"
                >
                  {{ file.name }}
                </VChip>
              </div>
              <div v-if="existingAttachments.length" class="text-caption text-medium-emphasis mt-3">
                Lampiran tersimpan: {{ existingAttachments.length }} file
              </div>
              <div v-if="existingAttachments.length" class="d-flex flex-column align-start gap-2 mt-2">
                <div v-for="(item, index) in existingAttachments" :key="`existing-${index}`" class="d-flex align-center gap-2">
                  <a :href="item" target="_blank" rel="noopener">Lampiran {{ index + 1 }}</a>
                  <VBtn size="x-small" variant="text" color="error" @click="removeExistingAttachment(index)">Hapus</VBtn>
                </div>
              </div>
            </VCol>
            <VCol cols="12"><VTextarea v-model="form.expense_notes" label="Catatan Biaya" rows="2" /></VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isFormDialogOpen=false">Batal</VBtn>
        <VBtn color="primary" :loading="isSubmitting" :disabled="isSubmitting" @click="submitForm">Simpan</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDetailDialogOpen" max-width="720">
    <VCard>
      <VCardItem title="Detail Surat Jalan" />
      <VCardText>
        <VRow>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Order</div>
                <div class="text-body-1 font-weight-medium text-break">{{ detailItem?.orderVehicle?.order?.order_number || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Kendaraan</div>
                <div class="text-body-1 text-break">{{ detailItem?.orderVehicle?.vehicle?.plate_number || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Driver</div>
                <div class="text-body-1 text-break">{{ detailItem?.driver?.name || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Tujuan</div>
                <div class="text-body-1 text-break">{{ detailItem?.destination || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">BBM</div>
                <div class="text-body-1 text-break">{{ detailItem?.fuel_cost ?? '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Biaya Tol</div>
                <div class="text-body-1 text-break">{{ detailItem?.toll_fee ?? '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Biaya Parkir</div>
                <div class="text-body-1 text-break">{{ detailItem?.parking_fee ?? '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Biaya Inap</div>
                <div class="text-body-1 text-break">{{ detailItem?.stay_cost ?? '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal" class="h-100">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Biaya Lain-lain</div>
                <div class="text-body-1 text-break">{{ detailItem?.others ?? '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-1">Catatan</div>
                <div class="text-body-1 text-break">{{ detailItem?.expense_notes || '-' }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption text-medium-emphasis mb-3">Lampiran Gambar</div>
                <div v-if="detailAttachmentList.length === 0" class="text-body-2 text-medium-emphasis">Tidak ada lampiran.</div>
                <VRow v-else>
                  <VCol
                    v-for="(item, index) in detailAttachmentList"
                    :key="`detail-${index}`"
                    cols="12"
                    sm="6"
                    md="4"
                  >
                    <VCard variant="outlined" class="h-100">
                      <VImg :src="item" height="160" cover />
                      <VCardActions class="justify-space-between">
                        <VBtn size="small" variant="text" color="primary" @click="openDetailImagePreview(item)">Lihat</VBtn>
                        <VBtn size="small" variant="text" :href="item" target="_blank" rel="noopener">Buka Tab</VBtn>
                      </VCardActions>
                    </VCard>
                  </VCol>
                </VRow>
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

  <VDialog v-model="isImagePreviewDialogOpen" max-width="1000">
    <VCard>
      <VCardItem title="Preview Gambar">
        <template #append>
          <VBtn icon variant="text" @click="isImagePreviewDialogOpen = false">
            <VIcon icon="ri-close-line" />
          </VBtn>
        </template>
      </VCardItem>
      <VCardText>
        <VImg v-if="selectedPreviewImage" :src="selectedPreviewImage" max-height="75vh" contain />
      </VCardText>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="2500">{{ snackbar.text }}</VSnackbar>
</template>
