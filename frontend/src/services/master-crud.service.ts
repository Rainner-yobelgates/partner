import { request } from './http'

export type MasterListQuery = {
  page: number
  perPage: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type MasterListResponse<TItem> = {
  success: boolean
  message: string
  data: TItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export type MasterDetailResponse<TItem> = {
  success: boolean
  message: string
  data: TItem
}

export type MasterMutationResponse<TItem = unknown> = {
  success: boolean
  message: string
  data?: TItem
}

export type MasterCrudService<TItem, TCreatePayload, TUpdatePayload = TCreatePayload> = {
  list: (query: MasterListQuery) => Promise<MasterListResponse<TItem>>
  detail: (uuid: string) => Promise<MasterDetailResponse<TItem>>
  create: (payload: TCreatePayload) => Promise<MasterMutationResponse<TItem>>
  update: (id: string | number, payload: TUpdatePayload) => Promise<MasterMutationResponse<TItem>>
  remove: (id: string | number) => Promise<MasterMutationResponse>
}

const buildQueryString = (query: MasterListQuery) => {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('perPage', String(query.perPage))

  if (query.search)
    params.set('search', query.search)

  if (query.sortBy)
    params.set('sortBy', query.sortBy)

  if (query.sortOrder)
    params.set('sortOrder', query.sortOrder)

  return params.toString()
}

export function createMasterCrudService<TItem, TCreatePayload, TUpdatePayload = TCreatePayload>(
  resourcePath: string,
): MasterCrudService<TItem, TCreatePayload, TUpdatePayload> {
  return {
    list(query) {
      const qs = buildQueryString(query)
      return request<MasterListResponse<TItem>>(`/${resourcePath}?${qs}`)
    },
    detail(uuid) {
      return request<MasterDetailResponse<TItem>>(`/${resourcePath}/${uuid}`)
    },
    create(payload) {
      return request<MasterMutationResponse<TItem>>(`/${resourcePath}`, {
        method: 'POST',
        body: payload,
      })
    },
    update(id, payload) {
      return request<MasterMutationResponse<TItem>>(`/${resourcePath}/${id}`, {
        method: 'PUT',
        body: payload,
      })
    },
    remove(id) {
      return request<MasterMutationResponse>(`/${resourcePath}/${id}`, {
        method: 'DELETE',
      })
    },
  }
}
