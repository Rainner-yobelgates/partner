import { request } from './http'
import type { MasterStatus } from './masters'

export type TripSheetItem = {
  id: string
  trip_sheets_uuid: string
  order_vehicle_id?: string | null
  driver_id?: string | null
  assistant_id?: string | null
  destination?: string | null
  fuel_cost?: string | null
  toll_fee?: string | null
  parking_fee?: string | null
  stay_cost?: string | null
  others?: string | null
  expense_notes?: string | null
  attachment?: string | null
  status?: MasterStatus | null
  public_submitted_at?: string | null
  created_at?: string
  updated_at?: string
  orderVehicle?: {
    id: string
    order?: {
      id: string
      order_number?: string | null
      customer_name?: string | null
      customer_phone?: string | null
      pickup_location?: string | null
      standby_time?: string | null
      start_date?: string | null
      finish_date?: string | null
      destination?: string | null
      dropoff_location?: string | null
    } | null
    vehicle?: { id: string; plate_number?: string | null; vehicle_type?: string | null } | null
  } | null
  driver?: { id: string; name?: string | null } | null
  assistant?: { id: string; name?: string | null } | null
}

export type TripSheetPayload = {
  order_vehicle_id: string
  driver_id?: string
  assistant_id?: string
  fuel_cost?: string
  toll_fee?: string
  parking_fee?: string
  stay_cost?: string
  others?: string
  expense_notes?: string
  attachment?: string
  status?: MasterStatus
}

export type TripSheetPublicPayload = {
  driver_id?: string
  assistant_id?: string
  fuel_cost?: string
  toll_fee?: string
  parking_fee?: string
  stay_cost?: string
  others?: string
  expense_notes?: string
  attachment?: string
  status?: MasterStatus
}

export type TripSheetListQuery = {
  page: number
  perPage: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  status?: MasterStatus
  order_id?: string
  driver_id?: string
  date_from?: string
  date_to?: string
}

export type TripSheetListResponse = {
  success: boolean
  message: string
  data: TripSheetItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export type TripSheetDetailResponse = {
  success: boolean
  message: string
  data: TripSheetItem
}

export type TripSheetMutationResponse = {
  success: boolean
  message: string
  data?: TripSheetItem
}

const buildQueryString = (query: TripSheetListQuery) => {
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

  if (query.order_id)
    params.set('order_id', query.order_id)

  if (query.driver_id)
    params.set('driver_id', query.driver_id)

  if (query.date_from)
    params.set('date_from', query.date_from)

  if (query.date_to)
    params.set('date_to', query.date_to)

  return params.toString()
}

export const tripSheetService = {
  list(query: TripSheetListQuery) {
    const qs = buildQueryString(query)
    return request<TripSheetListResponse>(`/trip-sheets?${qs}`)
  },
  detail(uuid: string) {
    return request<TripSheetDetailResponse>(`/trip-sheets/${uuid}`)
  },
  create(payload: TripSheetPayload | FormData) {
    return request<TripSheetMutationResponse>('/trip-sheets', {
      method: 'POST',
      body: payload,
    })
  },
  update(id: string | number, payload: Partial<TripSheetPayload> | FormData) {
    return request<TripSheetMutationResponse>(`/trip-sheets/${id}`, {
      method: 'PUT',
      body: payload,
    })
  },
  remove(id: string | number) {
    return request<TripSheetMutationResponse>(`/trip-sheets/${id}`, {
      method: 'DELETE',
    })
  },
  publicDetail(uuid: string) {
    return request<TripSheetDetailResponse>(`/trip-sheets/public/${uuid}`)
  },
  publicUpdate(uuid: string, payload: TripSheetPublicPayload | FormData) {
    return request<TripSheetMutationResponse>(`/trip-sheets/public/${uuid}`, {
      method: 'PUT',
      body: payload,
    })
  },
}
