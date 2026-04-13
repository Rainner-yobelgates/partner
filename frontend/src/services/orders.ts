import { request } from './http'
import type { MasterStatus } from './masters'

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

export type OrderVehicleItem = {
  id: string
  order_vehicles_uuid?: string
  order_id?: string | null
  vehicle_id?: string | null
  driver_id?: string | null
  assistant_driver_id?: string | null
  status?: MasterStatus | null
  vehicle?: {
    id: string
    plate_number?: string | null
    vehicle_type?: string | null
  } | null
  driver?: {
    id: string
    name?: string | null
  } | null
  assistantDriver?: {
    id: string
    name?: string | null
  } | null
  tripSheets?: {
    id: string
    trip_sheets_uuid: string
    status?: MasterStatus | null
    created_at?: string
    updated_at?: string
  }[]
  created_at?: string
  updated_at?: string
}

export type TripSheetLink = {
  order_vehicle_id: string | null
  trip_sheets_uuid: string
  url: string
}

export type OrderItem = {
  id: string
  orders_uuid: string
  order_number: string
  customer_name?: string | null
  customer_phone?: string | null
  customer_email?: string | null
  order_date?: string | null
  start_date?: string | null
  finish_date?: string | null
  usage_date?: string | null
  standby_time?: string | null
  pickup_location?: string | null
  destination?: string | null
  dropoff_location?: string | null
  total_vehicles?: number | null
  total_amount?: string | null
  status?: OrderStatus | null
  notes?: string | null
  created_at: string
  updated_at: string
  orderVehicles?: OrderVehicleItem[]
  trip_sheet_links?: TripSheetLink[]
}

export type OrderVehiclePayload = {
  vehicle_id: string
  driver_id?: string
  assistant_driver_id?: string
  status?: MasterStatus
}

export type OrderPayload = {
  order_number?: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  order_date?: string
  start_date?: string
  finish_date?: string
  usage_date?: string
  standby_time?: string
  pickup_location?: string
  destination?: string
  dropoff_location?: string
  total_amount?: string
  status?: OrderStatus
  notes?: string
  vehicles?: OrderVehiclePayload[]
}

export type OrderListQuery = {
  page: number
  perPage: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  status?: OrderStatus
  date_from?: string
  date_to?: string
}

export type OrderListResponse = {
  success: boolean
  message: string
  data: OrderItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export type OrderDetailResponse = {
  success: boolean
  message: string
  data: OrderItem
}

export type OrderMutationResponse = {
  success: boolean
  message: string
  data?: OrderItem
}

export type OrderRecapRow = {
  id: string
  orders_uuid: string
  order_number: string
  customer_name?: string | null
  customer_phone?: string | null
  status?: OrderStatus | null
  created_at: string
  trip_sheet_count: number
  income: string | null
  expense_fuel: string | null
  expense_toll: string | null
  expense_parking: string | null
  expense_stay: string | null
  expense_others: string | null
  total_expense: string | null
  profit: string | null
}

export type OrderRecapSummary = {
  order_count: number
  total_income: string | null
  total_expense: string | null
  total_profit: string | null
}

export type OrderRecapResponse = {
  success: boolean
  message: string
  data: OrderRecapRow[]
  summary: OrderRecapSummary
  filter: {
    month: number
    year: number
    created_from: string
    created_to_before: string
  }
}

const buildQueryString = (query: OrderListQuery) => {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('perPage', String(query.perPage))

  if (query.search)
    params.set('search', query.search)

  if (query.sortBy)
    params.set('sortBy', query.sortBy)

  if (query.sortOrder)
    params.set('sortOrder', query.sortOrder)

  if (query.status)
    params.set('status', query.status)

  if (query.date_from)
    params.set('date_from', query.date_from)

  if (query.date_to)
    params.set('date_to', query.date_to)

  return params.toString()
}

export const orderService = {
  list(query: OrderListQuery) {
    const qs = buildQueryString(query)
    return request<OrderListResponse>(`/orders?${qs}`)
  },
  detail(uuid: string) {
    return request<OrderDetailResponse>(`/orders/${uuid}`)
  },
  create(payload: OrderPayload) {
    return request<OrderMutationResponse>('/orders', {
      method: 'POST',
      body: payload,
    })
  },
  update(id: string | number, payload: Partial<OrderPayload>) {
    return request<OrderMutationResponse>(`/orders/${id}`, {
      method: 'PUT',
      body: payload,
    })
  },
  remove(id: string | number) {
    return request<OrderMutationResponse>(`/orders/${id}`, {
      method: 'DELETE',
    })
  },
  recap(month: number, year: number) {
    const params = new URLSearchParams()
    params.set('month', String(month))
    params.set('year', String(year))
    return request<OrderRecapResponse>(`/orders/recap?${params.toString()}`)
  },
}
