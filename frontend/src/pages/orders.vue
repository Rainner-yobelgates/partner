<script setup lang="ts">
import { ApiError } from '@/services/http'
import { orderService, type OrderItem, type OrderPayload, type OrderStatus, type TripSheetLink } from '@/services/orders'
import {
  type MasterStatus,
  vehicleMasterService,
  type VehicleItem,
} from '@/services/masters'
import { useAuthStore } from '@/stores/auth'
import { optionalPhoneRule, sanitizePhoneNumber } from '@/utils/phone'
import {
  blockKeysNonDecimalMoney,
  parseOptionalApiDecimalMoney,
  sanitizeDecimalMoneyInput,
} from '@/utils/money-input'

type OrderForm = {
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email: string
  order_date: string
  start_date: string
  finish_date: string
  standby_time: string
  pickup_location: string
  destination: string
  total_amount: string
  status: OrderStatus
  notes: string
}

type OrderVehicleForm = {
  vehicle_id: string
  status: MasterStatus
}

const authStore = useAuthStore()
const canCreate = computed(() => authStore.hasPermission('order:create'))
const canUpdate = computed(() => authStore.hasPermission('order:update'))
const canDelete = computed(() => authStore.hasPermission('order:delete'))
const canDetail = computed(() => authStore.hasPermission('order:detail'))

const rows = ref<OrderItem[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortBy = ref<'created_at' | 'order_number' | 'usage_date' | 'updated_at'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const isLoading = ref(false)
const isSubmitting = ref(false)
const isFormDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isLinksDialogOpen = ref(false)
const isDetailDialogOpen = ref(false)
const isDetailLoading = ref(false)

const editedItem = ref<OrderItem | null>(null)
const detailItem = ref<OrderItem | null>(null)
const tripSheetLinks = ref<TripSheetLink[]>([])
const detailLinks = ref<TripSheetLink[]>([])

const vehicles = ref<VehicleItem[]>([])

const vehicleAssignments = ref<OrderVehicleForm[]>([])

const form = ref<OrderForm>({
  order_number: '',
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  order_date: '',
  start_date: '',
  finish_date: '',
  standby_time: '',
  pickup_location: '',
  destination: '',
  total_amount: '',
  status: 'PENDING',
  notes: '',
})

const snackbar = ref({ show: false, color: 'success', text: '' })

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const isEditMode = computed(() => Boolean(editedItem.value))

const vehicleOptions = computed(() => vehicles.value.map(v => ({
  title: [v.plate_number, v.vehicle_type, v.hull_number].filter(Boolean).join(' � ') || `Kendaraan #${v.id}`,
  subtitle: `No. Lambung: ${v.hull_number || '-'} | Tipe: ${v.vehicle_type || '-'}`,
  value: v.id,
})))

const phoneRules = [optionalPhoneRule]

/** Tampilan rupiah dari string DECIMAL API (mis. "1500000.00"). */
const formatMoneyId = (value?: string | null) => {
  if (value == null || value === '')
    return '-'
  const n = Number(value)
  if (!Number.isFinite(n))
    return value
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

const onTotalAmountInput = (v: string) => {
  form.value.total_amount = sanitizeDecimalMoneyInput(String(v ?? ''))
}

const showToast = (text: string, color: 'success' | 'error' = 'success') => {
  snackbar.value = { show: true, color, text }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError)
    return error.message

  return 'Terjadi kesalahan. Silakan coba lagi.'
}

const pad2 = (value: number) => value.toString().padStart(2, '0')
const getCurrentTimeInput = () => {
  const now = new Date()
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`
}
const getTodayDateInput = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}
const toInputDate = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : ''
const toInputTime = (value?: string | null) => {
  if (!value)
    return getCurrentTimeInput()

  const date = new Date(value)
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}
const buildStandbyDateTime = (time: string) => time ? `${getTodayDateInput()}T${time}` : undefined

const formatDate = (value?: string | null) => {
  if (!value)
    return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const formatDateOnly = (value?: string | null) => {
  if (!value)
    return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
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

const getStartDate = (item: OrderItem) => item.start_date || item.usage_date || null
const getFinishDate = (item: OrderItem) => item.finish_date || item.usage_date || null
const getDestination = (item: OrderItem) => item.destination || item.dropoff_location || null
const formatOrderPeriod = (item: OrderItem) => {
  const startDate = getStartDate(item)
  const finishDate = getFinishDate(item)
  if (!startDate && !finishDate)
    return '-'

  if (startDate && finishDate)
    return `${formatDateOnly(startDate)} - ${formatDateOnly(finishDate)}`

  return formatDateOnly(startDate || finishDate)
}

const buildTripSheetUrl = (orderNumber: string, uuid: string) => `/trip-sheets/${encodeURIComponent(orderNumber)}/${uuid}`

const extractTripSheetLinks = (order: OrderItem): TripSheetLink[] => {
  if (order.trip_sheet_links && order.trip_sheet_links.length)
    return order.trip_sheet_links

  if (!order.orderVehicles?.length)
    return []

  return order.orderVehicles.flatMap((ov, index) => (ov.tripSheets || []).map(ts => ({
    order_vehicle_id: ov.id ?? String(index + 1),
    trip_sheets_uuid: ts.trip_sheets_uuid,
    url: buildTripSheetUrl(order.order_number, ts.trip_sheets_uuid),
  })))
}

const fetchOptions = async () => {
  try {
    const vehicleRes = await vehicleMasterService.list({ page: 1, perPage: 100, sortBy: 'created_at', sortOrder: 'desc' })
    vehicles.value = vehicleRes.data.filter(vehicle => vehicle.status === 'ACTIVE')
  }
  catch (error) {
    console.error('[pages/orders.vue]', error)
  }
}

const fetchOrders = async () => {
  isLoading.value = true

  try {
    const response = await orderService.list({
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
    console.error('[pages/orders.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  editedItem.value = null
  form.value = {
    order_number: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    order_date: '',
    start_date: '',
    finish_date: '',
    standby_time: getCurrentTimeInput(),
    pickup_location: '',
    destination: '',
    total_amount: '',
    status: 'PENDING',
    notes: '',
  }
  vehicleAssignments.value = []
}

const addVehicleRow = () => {
  vehicleAssignments.value.push({
    vehicle_id: '',
    status: 'ACTIVE',
  })
}

const removeVehicleRow = (index: number) => {
  vehicleAssignments.value.splice(index, 1)
}

const openCreateDialog = () => {
  resetForm()
  addVehicleRow()
  isFormDialogOpen.value = true
}

const openEditDialog = (item: OrderItem) => {
  editedItem.value = item
  form.value = {
    order_number: item.order_number,
    customer_name: item.customer_name || '',
    customer_phone: sanitizePhoneNumber(item.customer_phone || ''),
    customer_email: item.customer_email || '',
    order_date: toInputDate(item.order_date),
    start_date: toInputDate(getStartDate(item)),
    finish_date: toInputDate(getFinishDate(item)),
    standby_time: toInputTime(item.standby_time),
    pickup_location: item.pickup_location || '',
    destination: getDestination(item) || '',
    total_amount: item.total_amount?.trim() ? item.total_amount : '',
    status: item.status || 'PENDING',
    notes: item.notes || '',
  }

  vehicleAssignments.value = (item.orderVehicles || []).map(ov => ({
    vehicle_id: ov.vehicle_id || '',
    status: (ov.status || 'ACTIVE') as MasterStatus,
  }))

  if (vehicleAssignments.value.length === 0)
    addVehicleRow()

  isFormDialogOpen.value = true
}

const buildPayload = (): OrderPayload => {
  const totalAmountPayload = parseOptionalApiDecimalMoney(form.value.total_amount)

  return {
    order_number: form.value.order_number.trim() || undefined,
    customer_name: form.value.customer_name.trim() || undefined,
    customer_phone: sanitizePhoneNumber(form.value.customer_phone) || undefined,
    customer_email: form.value.customer_email.trim() || undefined,
    order_date: form.value.order_date || undefined,
    start_date: form.value.start_date || undefined,
    finish_date: form.value.finish_date || undefined,
    usage_date: form.value.start_date || undefined,
    standby_time: buildStandbyDateTime(form.value.standby_time),
    pickup_location: form.value.pickup_location.trim() || undefined,
    destination: form.value.destination.trim() || undefined,
    dropoff_location: form.value.destination.trim() || undefined,
    ...(totalAmountPayload !== undefined && totalAmountPayload !== '__invalid__' && { total_amount: totalAmountPayload }),
    status: form.value.status,
    notes: form.value.notes.trim() || undefined,
    vehicles: vehicleAssignments.value
      .filter(v => v.vehicle_id)
      .map(v => ({
        vehicle_id: v.vehicle_id,
        status: v.status,
      })),
  }
}

const onPhoneInput = () => {
  form.value.customer_phone = sanitizePhoneNumber(form.value.customer_phone)
}

const submitForm = async () => {
  if (isSubmitting.value)
    return

  const totalAmountParsed = parseOptionalApiDecimalMoney(form.value.total_amount)
  if (totalAmountParsed === '__invalid__') {
    showToast('Total biaya tidak valid. Hanya angka; titik untuk desimal (maks. 13 digit bulat, 2 desimal).', 'error')
    return
  }

  isSubmitting.value = true

  const payload = buildPayload()

  try {
    if (editedItem.value) {
      await orderService.update(editedItem.value.id, payload)
      showToast('Pesanan berhasil diperbarui')
    }
    else {
      const response = await orderService.create(payload)
      showToast('Pesanan berhasil dibuat')
      page.value = 1
      if (response.data?.trip_sheet_links?.length) {
        tripSheetLinks.value = response.data.trip_sheet_links
        isLinksDialogOpen.value = true
      }
    }

    isFormDialogOpen.value = false
    await fetchOrders()
  }
  catch (error) {
    console.error('[pages/orders.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const openDeleteDialog = (item: OrderItem) => {
  editedItem.value = item
  isDeleteDialogOpen.value = true
}

const openDetailDialog = async (item: OrderItem) => {
  if (isDetailLoading.value)
    return

  isDetailDialogOpen.value = true
  isDetailLoading.value = true
  detailItem.value = null
  detailLinks.value = []

  try {
    const response = await orderService.detail(item.orders_uuid)
    detailItem.value = response.data
    detailLinks.value = extractTripSheetLinks(response.data)
  }
  catch (error) {
    console.error('[pages/orders.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isDetailLoading.value = false
  }
}

const confirmDelete = async () => {
  if (!editedItem.value || isSubmitting.value)
    return

  isSubmitting.value = true

  try {
    await orderService.remove(editedItem.value.id)
    isDeleteDialogOpen.value = false
    showToast('Pesanan berhasil dihapus')

    if (rows.value.length === 1 && page.value > 1)
      page.value -= 1

    await fetchOrders()
  }
  catch (error) {
    console.error('[pages/orders.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const onSearch = async () => {
  page.value = 1
  await fetchOrders()
}

watch([page, perPage, sortBy, sortOrder], fetchOrders)

onMounted(async () => {
  await fetchOptions()
  await fetchOrders()
})
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <span class="text-h6">Data Pesanan</span>
          <VBtn v-if="canCreate" color="primary" prepend-icon="ri-add-line" @click="openCreateDialog">Tambah Pesanan</VBtn>
        </div>
      </template>
    </VCardItem>

    <VCardText>
      <VRow>
        <VCol cols="12" md="5">
          <VTextField v-model="search" label="Cari pesanan" placeholder="Nomor / customer / kontrak / klien" prepend-inner-icon="ri-search-line" @keyup.enter="onSearch" />
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
              { title: 'Nomor Pesanan', value: 'order_number' },
              { title: 'Tanggal Mulai', value: 'usage_date' },
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
            <th>Nomor</th>
            <th>Start - Finish</th>
            <th>Jumlah Kendaraan</th>
            <th>Total</th>
            <th>Status</th>
            <th>Diubah Pada</th>
            <th class="text-end">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!isLoading && rows.length === 0">
            <td colspan="7" class="text-center text-medium-emphasis py-6">Data pesanan belum ada.</td>
          </tr>
          <tr v-for="item in rows" :key="item.id">
            <td class="font-weight-medium">{{ item.order_number }}</td>
            <td>{{ formatOrderPeriod(item) }}</td>
            <td>{{ item.total_vehicles ?? '-' }}</td>
            <td>{{ formatMoneyId(item.total_amount) }}</td>
            <td><VChip size="small" :color="item.status === 'CONFIRMED' ? 'success' : item.status === 'CANCELLED' ? 'error' : 'warning'" label>{{ item.status || '-' }}</VChip></td>
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

  <VDialog v-model="isFormDialogOpen" max-width="960">
    <VCard>
      <VCardItem :title="isEditMode ? 'Ubah Pesanan' : 'Tambah Pesanan'" />
      <VCardText>
        <VForm @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12" md="4"><VTextField v-model="form.order_number" label="Nomor Pesanan (Otomatis)" disabled readonly placeholder="Dibuat otomatis" /></VCol>
            <VCol cols="12" md="4"><VTextField v-model="form.customer_name" label="Nama Customer" /></VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="form.customer_phone"
                label="Telepon"
                type="tel"
                inputmode="numeric"
                :maxlength="15"
                :rules="phoneRules"
                @update:model-value="onPhoneInput"
              />
            </VCol>
            <VCol cols="12" md="4"><VTextField v-model="form.customer_email" label="Email" type="email" /></VCol>
            <VCol cols="12" md="4"><VTextField v-model="form.order_date" label="Tanggal Pesanan" type="date" /></VCol>
            <VCol cols="12" md="4"><VTextField v-model="form.start_date" label="Tanggal Mulai" type="date" /></VCol>
            <VCol cols="12" md="4"><VTextField v-model="form.finish_date" label="Tanggal Selesai" type="date" /></VCol>
            <VCol cols="12" md="4"><VTextField v-model="form.standby_time" label="Waktu Tunggu" type="time" /></VCol>
            <VCol cols="12" md="4">
              <VTextField
                :model-value="form.total_amount"
                label="Total Biaya"
                placeholder="1500000.00"
                inputmode="decimal"
                autocomplete="off"
                persistent-hint
                @update:model-value="onTotalAmountInput"
                @keydown="blockKeysNonDecimalMoney"
              />
            </VCol>
            <VCol cols="12" md="6"><VTextField v-model="form.pickup_location" label="Pickup Location" /></VCol>
            <VCol cols="12" md="6"><VTextField v-model="form.destination" label="Tujuan" /></VCol>
            <VCol cols="12" md="4"><VSelect v-model="form.status" label="Status" :items="['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']" /></VCol>
            <VCol cols="12"><VTextarea v-model="form.notes" label="Catatan" rows="2" /></VCol>
          </VRow>

          <VDivider class="my-4" />

          <div class="d-flex align-center justify-space-between">
            <span class="text-subtitle-1 font-weight-medium">Kendaraan</span>
            <VBtn size="small" variant="text" color="primary" @click="addVehicleRow">Tambah Kendaraan</VBtn>
          </div>

          <VTable density="compact" class="mt-2">
            <thead>
              <tr>
                <th style="min-width: 320px">Kendaraan</th>
                <th>Status</th>
                <th class="text-end">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in vehicleAssignments" :key="index">
                <td>
                  <VAutocomplete
                    v-model="row.vehicle_id"
                    :items="vehicleOptions"
                    item-title="title"
                    item-value="value"
                    placeholder="Pilih kendaraan"
                    no-data-text="Kendaraan tidak ditemukan"
                  >
                    <template #item="{ props, item }">
                      <VListItem v-bind="props" :subtitle="item.raw.subtitle" />
                    </template>
                    <template #selection="{ item }">
                      <span class="text-body-2">{{ item.raw.title }}</span>
                    </template>
                  </VAutocomplete>
                </td>
                <td style="min-width: 130px">
                  <VSelect v-model="row.status" :items="['ACTIVE', 'INACTIVE']" />
                </td>
                <td class="text-end">
                  <VBtn size="x-small" variant="text" color="error" @click="removeVehicleRow(index)">Hapus</VBtn>
                </td>
              </tr>
              <tr v-if="vehicleAssignments.length === 0">
                <td colspan="3" class="text-center text-medium-emphasis py-4">Belum ada kendaraan.</td>
              </tr>
            </tbody>
          </VTable>
        </VForm>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isFormDialogOpen = false">Batal</VBtn>
        <VBtn color="primary" :loading="isSubmitting" :disabled="isSubmitting" @click="submitForm">Simpan</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDetailDialogOpen" max-width="900">
    <VCard>
      <VCardItem title="Detail Pesanan" />
      <VCardText>
        <VProgressLinear v-if="isDetailLoading" indeterminate color="primary" class="mb-4" />
        <div v-else-if="!detailItem" class="text-center text-medium-emphasis py-6">Data pesanan tidak ditemukan.</div>
        <template v-else>
          <VRow>
            <VCol cols="12" md="4">
              <div class="text-sm text-medium-emphasis">Nomor Pesanan</div>
              <div class="text-body-1 font-weight-medium">{{ detailItem.order_number }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-sm text-medium-emphasis">Customer</div>
              <div class="text-body-1 font-weight-medium">{{ detailItem.customer_name || '-' }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-sm text-medium-emphasis">Telepon</div>
              <div class="text-body-1 font-weight-medium">{{ detailItem.customer_phone || '-' }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-sm text-medium-emphasis">Email</div>
              <div class="text-body-1 font-weight-medium">{{ detailItem.customer_email || '-' }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-sm text-medium-emphasis">Tanggal Pesanan</div>
              <div class="text-body-1 font-weight-medium">{{ formatDate(detailItem.order_date) }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-sm text-medium-emphasis">Start Date</div>
              <div class="text-body-1 font-weight-medium">{{ formatDateOnly(getStartDate(detailItem)) }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-sm text-medium-emphasis">Finish Date</div>
              <div class="text-body-1 font-weight-medium">{{ formatDateOnly(getFinishDate(detailItem)) }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-sm text-medium-emphasis">Standby</div>
              <div class="text-body-1 font-weight-medium">{{ formatTimeOnly(detailItem.standby_time) }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-sm text-medium-emphasis">Pickup</div>
              <div class="text-body-1 font-weight-medium">{{ detailItem.pickup_location || '-' }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-sm text-medium-emphasis">Tujuan</div>
              <div class="text-body-1 font-weight-medium">{{ getDestination(detailItem) || '-' }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-sm text-medium-emphasis">Jumlah Kendaraan</div>
              <div class="text-body-1 font-weight-medium">{{ detailItem.total_vehicles ?? detailItem.orderVehicles?.length ?? '-' }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-sm text-medium-emphasis">Total Biaya</div>
              <div class="text-body-1 font-weight-medium">{{ formatMoneyId(detailItem.total_amount) }}</div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="text-sm text-medium-emphasis">Status</div>
              <div class="text-body-1 font-weight-medium">{{ detailItem.status || '-' }}</div>
            </VCol>
            <VCol cols="12">
              <div class="text-sm text-medium-emphasis">Catatan</div>
              <div class="text-body-1 font-weight-medium">{{ detailItem.notes || '-' }}</div>
            </VCol>
          </VRow>

          <VDivider class="my-4" />

          <div class="text-subtitle-1 font-weight-medium mb-2">Link Trip Sheet Driver</div>
          <VTable density="compact">
            <thead>
              <tr>
                <th>Kendaraan Pesanan</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="detailLinks.length === 0">
                <td colspan="2" class="text-center text-medium-emphasis py-4">Belum ada link trip sheet.</td>
              </tr>
              <tr v-for="(link, index) in detailLinks" :key="link.trip_sheets_uuid">
                <td>#{{ index + 1 }}</td>
                <td class="text-truncate">
                  <a :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.url }}</a>
                </td>
              </tr>
            </tbody>
          </VTable>
        </template>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isDetailDialogOpen = false">Tutup</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDeleteDialogOpen" max-width="420">
    <VCard>
      <VCardItem title="Hapus Pesanan" />
      <VCardText>Yakin hapus pesanan <strong>{{ editedItem?.order_number }}</strong>?</VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isDeleteDialogOpen = false">Batal</VBtn>
        <VBtn color="error" :loading="isSubmitting" :disabled="isSubmitting" @click="confirmDelete">Hapus</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isLinksDialogOpen" max-width="700">
    <VCard>
      <VCardItem title="Link Trip Sheet" />
      <VCardText>
        <p class="mb-4 text-sm text-medium-emphasis">
          Bagikan link berikut ke driver untuk mengisi trip sheet.
        </p>
        <VTable density="compact">
          <thead>
            <tr>
              <th>Kendaraan Pesanan</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(link, index) in tripSheetLinks" :key="link.trip_sheets_uuid">
              <td>#{{ index + 1 }}</td>
              <td class="text-truncate">
                <a :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.url }}</a>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isLinksDialogOpen = false">Tutup</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="2500">{{ snackbar.text }}</VSnackbar>
</template>
