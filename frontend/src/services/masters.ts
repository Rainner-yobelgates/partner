import { createMasterCrudService } from './master-crud.service'
import { request } from './http'

export type MasterStatus = 'ACTIVE' | 'INACTIVE'
export type VehicleType = 'EVALIA' | 'MEDIUM_BUS' | 'HIACE'
export type DriverType = 'ASSISTANT' | 'RESERVE' | 'MAIN'
export type ServiceType = 'MAINTENANCE' | 'REPAIR' | 'OIL_CHANGE' | 'INSPECTION'

export type RoleItem = {
  id: string
  role_uuid: string
  name: string
  description?: string | null
  status: MasterStatus
  created_at: string
  updated_at: string
}

export type RolePayload = {
  name: string
  description?: string
  status?: MasterStatus
}

export type UserItem = {
  id: string
  users_uuid: string
  username: string
  email: string
  role_id: string | null
  role: {
    id: string
    name: string
  } | null
  status: MasterStatus
  created_at: string
  updated_at: string
}

export type UserPayload = {
  role_id?: string
  email: string
  password?: string
  username: string
  status?: MasterStatus
}

export type DriverItem = {
  id: string
  drivers_uuid: string
  name: string
  phone_number?: string | null
  emergency_contact?: string | null
  address?: string | null
  type?: DriverType | null
  status?: MasterStatus | null
  vehicle_id?: string | null
  vehicle: {
    id: string
    plate_number?: string | null
  } | null
  created_at: string
  updated_at: string
}

export type DriverPayload = {
  vehicle_id?: string
  name: string
  phone_number?: string
  emergency_contact?: string
  address?: string
  type?: DriverType
  status?: MasterStatus
}

export type VehicleItem = {
  id: string
  vehicles_uuid: string
  plate_number?: string | null
  hull_number?: string | null
  frame_number?: string | null
  machine_number?: string | null
  vehicle_type?: VehicleType | null
  brand?: string | null
  model?: string | null
  status?: MasterStatus | null
  created_at: string
  updated_at: string
}

export type VehiclePayload = {
  plate_number?: string
  hull_number?: string
  vehicle_type?: VehicleType
  brand?: string
  model?: string
  status?: MasterStatus
}

export type FacilityItem = {
  id: string
  facilities_uuid: string
  name: string
  cost: number | null
  description?: string | null
  status?: MasterStatus | null
  created_at: string
  updated_at: string
}

export type FacilityPayload = {
  name: string
  cost: number
  description?: string
  status?: MasterStatus
}

export type RouteItem = {
  id: string
  routes_uuid: string
  origin?: string | null
  destination?: string | null
  distance?: number | null
  estimated_time?: number | null
  status?: MasterStatus | null
  created_at: string
  updated_at: string
}

export type RoutePayload = {
  origin?: string
  destination?: string
  distance?: number
  estimated_time?: number
  status?: MasterStatus
}

export type ClientItem = {
  id: string
  clients_uuid: string
  name: string
  code?: string | null
  contact_person?: string | null
  phone_number?: string | null
  email?: string | null
  address?: string | null
  status?: MasterStatus | null
  created_at: string
  updated_at: string
}

export type ClientPayload = {
  name: string
  code?: string
  contact_person?: string
  phone_number?: string
  email?: string
  address?: string
  status?: MasterStatus
}

export type ContractItem = {
  id: string
  contracts_uuid: string
  contract_number?: string | null
  client_id: string
  contract_month: number
  contract_year: number
  contact_person?: string | null
  phone_number?: string | null
  email?: string | null
  address?: string | null
  contract_value?: string | null
  status?: MasterStatus | null
  client?: {
    id: string
    clients_uuid: string
    name: string
    code?: string | null
  } | null
  created_at: string
  updated_at: string
}

export type ContractPayload = {
  contract_number?: string
  client_id: string
  contract_month: number
  contract_year: number
  contact_person?: string
  phone_number?: string
  email?: string
  address?: string
  contract_value?: string
  status?: MasterStatus
}

export type ShuttleItem = {
  id: string
  shuttles_uuid: string
  client_id: string
  vehicle_id?: string | null
  route_id?: string | null
  client?: {
    id: string
    clients_uuid?: string
    name?: string | null
    code?: string | null
  } | null
  vehicle?: {
    id: string
    plate_number?: string | null
    vehicle_type?: string | null
  } | null
  route?: {
    id: string
    origin?: string | null
    destination?: string | null
  } | null
  crew_incentive?: string | null
  scheduled_date?: string | null
  fuel?: string | null
  toll_fee?: string | null
  others?: string | null
  status?: MasterStatus | null
  created_at: string
  updated_at: string
}

export type ShuttlePayload = {
  client_id?: string
  vehicle_id?: string
  route_id?: string
  crew_incentive?: string
  scheduled_date?: string
  fuel?: string
  toll_fee?: string
  others?: string
  status?: MasterStatus
}

export type VehicleServiceItem = {
  id: string
  vehicle_services_uuid: string
  vehicle_id?: string | null
  vehicle?: {
    id: string
    plate_number?: string | null
    vehicle_type?: string | null
  } | null
  service_date?: string | null
  service_type?: ServiceType | null
  cost?: number | null
  description?: string | null
  status?: MasterStatus | null
  created_at: string
  updated_at: string
}

export type VehicleServicePayload = {
  vehicle_id?: string
  service_date?: string
  service_type?: ServiceType
  cost?: number
  description?: string
  status?: MasterStatus
}

export type ContractRecapClientOption = {
  id: string
  clients_uuid: string
  name: string
  code?: string | null
}

export type ContractRecapDefaultSelection = {
  client_id: string
  client_name: string
  client_code?: string | null
  month: number
  year: number
  contract_number?: string | null
}

export type ContractRecapShuttleRow = {
  id: string
  shuttles_uuid: string
  scheduled_date: string
  status?: MasterStatus | null
  vehicle_plate_number?: string | null
  vehicle_type?: string | null
  route_origin?: string | null
  route_destination?: string | null
  crew_incentive: string
  fuel: string
  toll_fee: string
  others: string
  total_cost: string
}

export type ContractRecapSummary = {
  contract_count: number
  shuttle_trip_count: number
  total_income: string
  total_expense: string
  total_profit: string
  expense_crew_incentive: string
  expense_fuel: string
  expense_toll: string
  expense_others: string
}

export type ContractRecapRow = {
  client_id: string
  client_name: string
  client_code?: string | null
  month: number
  year: number
  period_label: string
  contract: {
    id: string
    contract_number?: string | null
    contract_value: string
  } | null
  summary: ContractRecapSummary
  shuttles: ContractRecapShuttleRow[]
  filter: {
    scheduled_from: string
    scheduled_to_before: string
  }
}

export type ContractRecapDefaultResponse = {
  success: boolean
  message: string
  data: ContractRecapDefaultSelection | null
}

export type ContractRecapClientOptionsResponse = {
  success: boolean
  message: string
  data: ContractRecapClientOption[]
}

export type ContractRecapResponse = {
  success: boolean
  message: string
  data: ContractRecapRow
}

export const contractRecapService = {
  defaultSelection() {
    return request<ContractRecapDefaultResponse>('/contracts/recap/default')
  },
  clients() {
    return request<ContractRecapClientOptionsResponse>('/contracts/recap/clients')
  },
  recap(clientId: string, month: number, year: number) {
    const params = new URLSearchParams({
      client_id: clientId,
      month: String(month),
      year: String(year),
    })
    return request<ContractRecapResponse>(`/contracts/recap?${params.toString()}`)
  },
}

export const roleMasterService = createMasterCrudService<RoleItem, RolePayload>('roles')
export const userMasterService = createMasterCrudService<UserItem, UserPayload, UserPayload>('users')
export const driverMasterService = createMasterCrudService<DriverItem, DriverPayload, DriverPayload>('drivers')
export const vehicleMasterService = createMasterCrudService<VehicleItem, VehiclePayload, VehiclePayload>('vehicles')
export const routeMasterService = createMasterCrudService<RouteItem, RoutePayload, RoutePayload>('routes')
export const clientMasterService = createMasterCrudService<ClientItem, ClientPayload, ClientPayload>('clients')
export const contractMasterService = createMasterCrudService<ContractItem, ContractPayload, ContractPayload>('contracts')
export const shuttleMasterService = createMasterCrudService<ShuttleItem, ShuttlePayload, ShuttlePayload>('shuttles')
export const facilityMasterService = createMasterCrudService<FacilityItem, FacilityPayload, FacilityPayload>('facilities')
export const vehicleServiceMasterService = createMasterCrudService<VehicleServiceItem, VehicleServicePayload, VehicleServicePayload>('vehicle-services')

