import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

type ApiErrorPayload = {
  success?: boolean
  message?: string
  error?: string
  errors?: string[]
  [key: string]: unknown
}

function payloadToMessage(payload: ApiErrorPayload | undefined, fallback: string): string {
  const m = payload?.message
  if (Array.isArray(m))
    return m.filter(Boolean).join(' ')
  if (typeof m === 'string' && m.trim() !== '')
    return m
  if (typeof payload?.error === 'string' && payload.error.trim() !== '')
    return payload.error
  return fallback
}

export class ApiError extends Error {
  status: number
  payload?: ApiErrorPayload

  constructor(message: string, status: number, payload?: ApiErrorPayload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

const rawBase = import.meta.env.VITE_API_BASE_URL
const API_BASE_URL = (typeof rawBase === 'string' && rawBase.trim() !== '' ? rawBase.trim() : 'http://localhost:3000').replace(/\/$/, '')

const getAccessToken = () => localStorage.getItem('access_token')

const clearSession = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('role_id')
  localStorage.removeItem('permissions')
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
  },
})

httpClient.interceptors.request.use(config => {
  const token = getAccessToken()
  if (token)
    config.headers.Authorization = `Bearer ${token}`

  return config
})

httpClient.interceptors.response.use(
  response => response,
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response?.status === 401)
      clearSession()

    return Promise.reject(error)
  },
)

export async function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  try {
    const config: AxiosRequestConfig = {
      url: path,
      method: (options.method as AxiosRequestConfig['method']) ?? 'GET',
      headers: options.headers as AxiosRequestConfig['headers'],
      data: options.body,
    }

    const response = await httpClient.request<TResponse>(config)
    const raw = response.data

    if (typeof raw === 'string' && raw.trimStart().startsWith('<')) {
      throw new ApiError(
        'Server mengembalikan HTML (bukan JSON). Periksa VITE_API_BASE_URL agar mengarah ke backend NestJS, bukan ke dev server Vite.',
        response.status,
      )
    }

    const payload = raw as ApiErrorPayload

    if (payload && typeof payload === 'object' && payload.success === false) {
      const message = payloadToMessage(payload, 'Request failed')
      throw new ApiError(message, response.status, payload)
    }

    return raw
  }
  catch (error) {
    if (error instanceof ApiError)
      throw error

    if (axios.isAxiosError<ApiErrorPayload>(error)) {
      if (!error.response) {
        throw new ApiError('Tidak bisa terhubung ke server API. Cek backend berjalan dan CORS aktif.', 0)
      }

      const payload = error.response?.data
      const status = error.response?.status ?? 500
      const message = typeof payload === 'object' && payload !== null
        ? payloadToMessage(payload, error.message ?? 'Request failed')
        : (error.message ?? 'Request failed')
      throw new ApiError(message, status, typeof payload === 'object' && payload !== null ? payload : undefined)
    }

    throw error instanceof Error ? error : new ApiError('Request failed', 500)
  }
}

