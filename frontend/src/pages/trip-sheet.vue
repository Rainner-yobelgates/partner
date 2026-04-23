<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ApiError } from '@/services/http'
import { tripSheetService, type TripSheetItem } from '@/services/trip-sheets'
import { driverMasterService, type DriverItem, type MasterStatus } from '@/services/masters'
import {
  blockKeysNonDecimalMoney,
  onPasteSanitizedDecimalMoney,
  parseOptionalApiDecimalMoney,
  sanitizeDecimalMoneyInput,
} from '@/utils/money-input'

type TripSheetPublicForm = {
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

type AttachmentPreview = {
  id: string
  file: File
  previewUrl: string
}

const route = useRoute()
const uuid = computed(() => String(route.params.uuid || ''))

const isLoading = ref(false)
const isDriverOptionsLoading = ref(false)
const isSubmitting = ref(false)
const tripSheet = ref<TripSheetItem | null>(null)
const drivers = ref<DriverItem[]>([])
const newAttachments = ref<AttachmentPreview[]>([])
const existingAttachments = ref<string[]>([])
const attachmentInputRef = ref<HTMLInputElement | null>(null)
const maxAttachmentSizeMb = 5
const maxAttachmentCount = 15

const form = ref<TripSheetPublicForm>({
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
const isPublicLocked = computed(() => Boolean(tripSheet.value?.public_submitted_at))
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
  appendSelectedOption(baseDriverOptions.value, form.value.driver_id, tripSheet.value?.driver?.name),
)

const assistantOptions = computed(() =>
  appendSelectedOption(baseDriverOptions.value, form.value.assistant_id, tripSheet.value?.assistant?.name),
)

const showToast = (text: string, color: 'success' | 'error' = 'success') => {
  snackbar.value = { show: true, color, text }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError)
    return error.message

  return 'Terjadi kesalahan. Silakan coba lagi.'
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
    console.error('[pages/trip-sheet.vue]', error)
    return [trimmed]
  }

  return [trimmed]
}

const formatDate = (value?: string | null) => {
  if (!value)
    return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const formatTimeOnly = (value?: string | null) => {
  if (!value)
    return '-'

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(2)} MB`

  return `${Math.max(1, Math.round(size / 1024))} KB`
}

const buildAttachmentKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`

const fromMoneyResponse = (value: string | number | null | undefined) => {
  if (value == null)
    return ''
  const s = String(value).trim()
  return s === '' ? '' : s
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

  newAttachments.value.forEach((item) => {
    data.append('attachments', item.file)
  })

  return data
}

const removeExistingAttachment = (index: number) => {
  existingAttachments.value.splice(index, 1)
}

const removeNewAttachment = (index: number) => {
  const [removed] = newAttachments.value.splice(index, 1)
  if (removed)
    URL.revokeObjectURL(removed.previewUrl)
}

const clearNewAttachments = () => {
  newAttachments.value.forEach(item => URL.revokeObjectURL(item.previewUrl))
  newAttachments.value = []

  if (attachmentInputRef.value)
    attachmentInputRef.value.value = ''
}

const openAttachmentPicker = () => {
  attachmentInputRef.value?.click()
}

const onAttachmentInputChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length)
    return

  const maxBytes = maxAttachmentSizeMb * 1024 * 1024
  const existingKeys = new Set(newAttachments.value.map(item => buildAttachmentKey(item.file)))
  let remainingSlots = maxAttachmentCount - newAttachments.value.length
  let skippedType = 0
  let skippedSize = 0
  let skippedDuplicate = 0

  for (const file of files) {
    if (remainingSlots <= 0)
      break

    if (!file.type.startsWith('image/')) {
      skippedType += 1
      continue
    }

    if (file.size > maxBytes) {
      skippedSize += 1
      continue
    }

    const key = buildAttachmentKey(file)
    if (existingKeys.has(key)) {
      skippedDuplicate += 1
      continue
    }

    existingKeys.add(key)
    remainingSlots -= 1
    newAttachments.value.push({
      id: `${key}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    })
  }

  if (newAttachments.value.length >= maxAttachmentCount && files.length > remainingSlots)
    showToast(`Maksimal ${maxAttachmentCount} gambar per surat jalan.`, 'error')

  if (skippedType)
    showToast(`${skippedType} file dilewati karena bukan gambar.`, 'error')

  if (skippedSize)
    showToast(`${skippedSize} file dilewati karena melebihi ${maxAttachmentSizeMb}MB.`, 'error')

  if (skippedDuplicate)
    showToast(`${skippedDuplicate} file duplikat dilewati.`, 'error')

  input.value = ''
}

const validateAttachments = () => {
  if (newAttachments.value.length > maxAttachmentCount) {
    showToast(`Maksimal ${maxAttachmentCount} file lampiran.`, 'error')
    return false
  }

  return true
}

const loadTripSheet = async () => {
  if (!uuid.value)
    return

  isLoading.value = true

  try {
    const response = await tripSheetService.publicDetail(uuid.value)
    tripSheet.value = response.data
    clearNewAttachments()
    existingAttachments.value = parseAttachmentValue(response.data.attachment)
    form.value = {
      driver_id: response.data.driver_id || '',
      assistant_id: response.data.assistant_id || '',
      fuel_cost: fromMoneyResponse(response.data.fuel_cost),
      toll_fee: fromMoneyResponse(response.data.toll_fee),
      parking_fee: fromMoneyResponse(response.data.parking_fee),
      stay_cost: fromMoneyResponse(response.data.stay_cost),
      others: fromMoneyResponse(response.data.others),
      expense_notes: response.data.expense_notes || '',
      status: response.data.status || 'ACTIVE',
    }
  }
  catch (error) {
    console.error('[pages/trip-sheet.vue]', error)
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
    console.error('[pages/trip-sheet.vue]', error)
  }
  finally {
    isDriverOptionsLoading.value = false
  }
}

const submitForm = async () => {
  if (isSubmitting.value || !uuid.value)
    return

  if (isPublicLocked.value) {
    showToast('Surat jalan dari link ini sudah pernah diisi.', 'error')
    return
  }

  if (!validateAttachments())
    return

  const moneyPayload = parseMoneyPayload()
  if (!moneyPayload)
    return

  isSubmitting.value = true

  try {
    await tripSheetService.publicUpdate(uuid.value, buildFormData(moneyPayload))
    showToast('Surat jalan berhasil disimpan')
    await loadTripSheet()
  }
  catch (error) {
    console.error('[pages/trip-sheet.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    loadTripSheet(),
    fetchDriverOptions(),
  ])
})

onBeforeUnmount(() => {
  clearNewAttachments()
})
</script>

<template>
  <div class="py-8 px-4 d-flex justify-center">
    <VCard max-width="980" class="w-100">
      <VCardItem>
        <template #title>
          <div class="d-flex flex-column gap-1">
            <span class="text-h6">Surat Jalan Driver</span>
            <span class="text-sm text-medium-emphasis">Silakan lengkapi data perjalanan di bawah ini.</span>
          </div>
        </template>
      </VCardItem>

      <VCardText>
        <VAlert v-if="isLoading" type="info" variant="tonal">Memuat data surat jalan...</VAlert>
        <VAlert v-else-if="!tripSheet" type="error" variant="tonal">Surat jalan tidak ditemukan.</VAlert>
        <VAlert
          v-else-if="isPublicLocked"
          type="success"
          variant="tonal"
          class="mb-4"
        >
          Form dari link ini sudah pernah diisi pada {{ formatDate(tripSheet.public_submitted_at) }} dan tidak dapat diubah lagi.
        </VAlert>

        <VRow v-if="tripSheet" class="mb-4">
          <VCol cols="12" md="3">
            <div class="text-sm text-medium-emphasis">Order</div>
            <div class="text-body-1 font-weight-medium">{{ tripSheet.orderVehicle?.order?.order_number || '-' }}</div>
          </VCol>
          <VCol cols="12" md="3">
            <div class="text-sm text-medium-emphasis">Kendaraan</div>
            <div class="text-body-1 font-weight-medium">{{ tripSheet.orderVehicle?.vehicle?.plate_number || '-' }}</div>
          </VCol>
          <VCol cols="12" md="3">
            <div class="text-sm text-medium-emphasis">Nama Customer</div>
            <div class="text-body-1 font-weight-medium">{{ tripSheet.orderVehicle?.order?.customer_name || '-' }}</div>
          </VCol>
          <VCol cols="12" md="3">
            <div class="text-sm text-medium-emphasis">No. Telp</div>
            <div class="text-body-1 font-weight-medium">{{ tripSheet.orderVehicle?.order?.customer_phone || '-' }}</div>
          </VCol>
          <VCol cols="12" md="3">
            <div class="text-sm text-medium-emphasis">Alamat Jemput</div>
            <div class="text-body-1 font-weight-medium">{{ tripSheet.orderVehicle?.order?.pickup_location || '-' }}</div>
          </VCol>
          <VCol cols="12" md="3">
            <div class="text-sm text-medium-emphasis">Jam Jemput</div>
            <div class="text-body-1 font-weight-medium">{{ formatTimeOnly(tripSheet.orderVehicle?.order?.standby_time) }}</div>
          </VCol>
          <VCol cols="12" md="3">
            <div class="text-sm text-medium-emphasis">Start Date</div>
            <div class="text-body-1 font-weight-medium">{{ formatDate(tripSheet.orderVehicle?.order?.start_date) }}</div>
          </VCol>
          <VCol cols="12" md="3">
            <div class="text-sm text-medium-emphasis">Finish Date</div>
            <div class="text-body-1 font-weight-medium">{{ formatDate(tripSheet.orderVehicle?.order?.finish_date) }}</div>
          </VCol>
          <VCol cols="12" md="6">
            <div class="text-sm text-medium-emphasis">Tujuan (dari Order)</div>
            <div class="text-body-1 font-weight-medium">{{ tripSheet.destination || tripSheet.orderVehicle?.order?.destination || tripSheet.orderVehicle?.order?.dropoff_location || '-' }}</div>
          </VCol>
        </VRow>

        <VForm v-if="tripSheet" @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12" md="3">
              <VSelect
                v-model="form.driver_id"
                :disabled="isPublicLocked || isSubmitting"
                label="Driver"
                :items="driverOptions"
                item-title="title"
                item-value="value"
                :loading="isDriverOptionsLoading"
                clearable
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="form.assistant_id"
                :disabled="isPublicLocked || isSubmitting"
                label="Assistant"
                :items="assistantOptions"
                item-title="title"
                item-value="value"
                :loading="isDriverOptionsLoading"
                clearable
              />
            </VCol>
            <VCol cols="12" md="6"><VSelect v-model="form.status" :disabled="isPublicLocked || isSubmitting" label="Status" :items="['ACTIVE', 'INACTIVE']" /></VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="form.fuel_cost"
                :disabled="isPublicLocked || isSubmitting"
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
                :disabled="isPublicLocked || isSubmitting"
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
                :disabled="isPublicLocked || isSubmitting"
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
                :disabled="isPublicLocked || isSubmitting"
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
                :disabled="isPublicLocked || isSubmitting"
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

            <VCol cols="12">
              <div class="d-flex flex-wrap align-center justify-space-between gap-3 mb-2">
                <div>
                  <div class="text-subtitle-2">Lampiran Gambar</div>
                  <div class="text-caption text-medium-emphasis">
                    Upload bisa berkali-kali. Maks {{ maxAttachmentCount }} gambar, {{ maxAttachmentSizeMb }}MB per gambar.
                  </div>
                </div>
                <div class="d-flex flex-wrap gap-2">
                  <VBtn
                    color="primary"
                    variant="outlined"
                    prepend-icon="ri-image-add-line"
                    :disabled="isPublicLocked || isSubmitting || newAttachments.length >= maxAttachmentCount"
                    @click="openAttachmentPicker"
                  >
                    Tambah Gambar
                  </VBtn>
                  <VBtn
                    variant="text"
                    color="secondary"
                    :disabled="isPublicLocked || isSubmitting || !newAttachments.length"
                    @click="clearNewAttachments"
                  >
                    Hapus Semua Baru
                  </VBtn>
                </div>
              </div>

              <input
                ref="attachmentInputRef"
                class="d-none"
                type="file"
                accept="image/*"
                multiple
                :disabled="isPublicLocked || isSubmitting"
                @change="onAttachmentInputChange"
              >

              <VAlert type="info" variant="tonal" density="comfortable" class="mb-3">
                Gambar baru: {{ newAttachments.length }} / {{ maxAttachmentCount }}
              </VAlert>

              <VRow v-if="newAttachments.length" class="mb-2">
                <VCol
                  v-for="(item, index) in newAttachments"
                  :key="item.id"
                  cols="12"
                  sm="6"
                  md="3"
                >
                  <VCard variant="tonal">
                    <VImg :src="item.previewUrl" height="130" cover />
                    <VCardText class="py-2 px-3">
                      <div class="text-body-2 text-truncate">{{ item.file.name }}</div>
                      <div class="text-caption text-medium-emphasis">{{ formatFileSize(item.file.size) }}</div>
                    </VCardText>
                    <VCardActions class="pt-0 px-2 pb-2 justify-end">
                      <VBtn
                        size="small"
                        variant="text"
                        color="error"
                        :disabled="isPublicLocked || isSubmitting"
                        @click="removeNewAttachment(index)"
                      >
                        Hapus
                      </VBtn>
                    </VCardActions>
                  </VCard>
                </VCol>
              </VRow>

              <div v-if="existingAttachments.length" class="mt-2">
                <div class="text-subtitle-2 mb-2">Lampiran Tersimpan ({{ existingAttachments.length }})</div>
                <VRow>
                  <VCol
                    v-for="(item, index) in existingAttachments"
                    :key="`existing-${index}`"
                    cols="12"
                    sm="6"
                    md="3"
                  >
                    <VCard variant="outlined">
                      <VImg :src="item" height="130" cover />
                      <VCardActions class="px-2 py-2">
                        <VBtn size="small" variant="text" :href="item" target="_blank" rel="noopener">Lihat</VBtn>
                        <VSpacer />
                        <VBtn
                          v-if="!isPublicLocked"
                          size="small"
                          variant="text"
                          color="error"
                          :disabled="isSubmitting"
                          @click="removeExistingAttachment(index)"
                        >
                          Hapus
                        </VBtn>
                      </VCardActions>
                    </VCard>
                  </VCol>
                </VRow>
              </div>
            </VCol>

            <VCol cols="12"><VTextarea v-model="form.expense_notes" :disabled="isPublicLocked || isSubmitting" label="Catatan Biaya" rows="2" /></VCol>
          </VRow>

          <div class="d-flex justify-end mt-4">
            <VBtn type="submit" color="primary" :loading="isSubmitting" :disabled="isSubmitting || isPublicLocked">Simpan</VBtn>
          </div>
        </VForm>
      </VCardText>
    </VCard>
  </div>

  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="2500">{{ snackbar.text }}</VSnackbar>
</template>
