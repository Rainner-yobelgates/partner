import { request } from './http'

export type DashboardFilterMeta = {
  year: number
  year_from: string
  year_to_before: string
  client_id: string | null
  client_name: string | null
  client_code: string | null
}

export type DashboardMasterSummary = {
  driver_count: number
  vehicle_count: number
  facility_count: number
  route_count: number
  vehicle_service_count: number
}

export type DashboardReportSummary = {
  shuttle_count: number
  client_count: number
  contract_count: number
}

export type DashboardMonthlyFinancial = {
  month: number
  label: string
  revenue: string
  expense: string
  profit: string
}

export type DashboardClientFinancial = {
  monthly: DashboardMonthlyFinancial[]
  totals: {
    total_revenue: string | null
    total_expense: string | null
    total_profit: string | null
  }
  expense_breakdown: {
    crew_incentive: string | null
    fuel: string | null
    toll_fee: string | null
    others: string | null
    total: string | null
  }
}

export type DashboardOrderFinancial = {
  summary: {
    order_count: number
    total_revenue: string | null
    total_expense: string | null
    total_profit: string | null
  }
  monthly: DashboardMonthlyFinancial[]
  expense_breakdown: {
    fuel_cost: string | null
    toll_fee: string | null
    parking_fee: string | null
    stay_cost: string | null
    others: string | null
    total: string | null
  }
  filter: {
    year: number
    created_from: string
    created_to_before: string
  }
}

export type DashboardOverview = {
  filter: DashboardFilterMeta
  master_summary: DashboardMasterSummary
  report_summary: DashboardReportSummary
  client_financial: DashboardClientFinancial
  order_financial: DashboardOrderFinancial
}

export type DashboardOverviewResponse = {
  success: boolean
  message: string
  data: DashboardOverview
}

export const dashboardService = {
  overview(year: number, clientId?: string | null) {
    const params = new URLSearchParams()
    params.set('year', String(year))
    if (clientId)
      params.set('client_id', clientId)
    return request<DashboardOverviewResponse>(`/dashboard?${params.toString()}`)
  },
}
