import { createMasterCrudService } from './master-crud.service'

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

export type ContractItem = {
  id: string
  contracts_uuid: string
  contract_number?: string | null
  contact_person?: string | null
  phone_number?: string | null
  email?: string | null
  address?: string | null
  start_date?: string | null
  end_date?: string | null
  status?: MasterStatus | null
  created_at: string
  updated_at: string
}

export type ContractPayload = {
  contract_number?: string
  contact_person?: string
  phone_number?: string
  email?: string
  address?: string
  start_date?: string
  end_date?: string
  status?: MasterStatus
}

export type ShuttleItem = {
  id: string
  shuttles_uuid: string
  contract_id?: string | null
  vehicle_id?: string | null
  route_id?: string | null
  contract?: {
    id: string
    contract_number?: string | null
    contact_person?: string | null
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
  crew_incentive?: number | null
  scheduled_date?: string | null
  fuel?: number | null
  toll_fee?: number | null
  others?: number | null
  status?: MasterStatus | null
  created_at: string
  updated_at: string
}

export type ShuttlePayload = {
  contract_id?: string
  vehicle_id?: string
  route_id?: string
  crew_incentive?: number
  scheduled_date?: string
  fuel?: number
  toll_fee?: number
  others?: number
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

// Fully implemented and used by Role page
export const roleMasterService = createMasterCrudService<RoleItem, RolePayload>('roles')

// Shared CRUD framework for other master resources
export const userMasterService = createMasterCrudService<UserItem, UserPayload, UserPayload>('users')
export const driverMasterService = createMasterCrudService<DriverItem, DriverPayload, DriverPayload>('drivers')
export const vehicleMasterService = createMasterCrudService<VehicleItem, VehiclePayload, VehiclePayload>('vehicles')
export const routeMasterService = createMasterCrudService<RouteItem, RoutePayload, RoutePayload>('routes')
export const contractMasterService = createMasterCrudService<ContractItem, ContractPayload, ContractPayload>('contracts')
export const shuttleMasterService = createMasterCrudService<ShuttleItem, ShuttlePayload, ShuttlePayload>('shuttles')
export const facilityMasterService = createMasterCrudService<FacilityItem, FacilityPayload, FacilityPayload>('facilities')
export const vehicleServiceMasterService = createMasterCrudService<VehicleServiceItem, VehicleServicePayload, VehicleServicePayload>('vehicle-services')
