import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

type ApiErrorPayload = {
  success?: boolean
  message?: string
  error?: string
  errors?: string[]
  [key: string]: unknown
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

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
      method: options.method as AxiosRequestConfig['method'],
      headers: options.headers as AxiosRequestConfig['headers'],
      data: options.body,
    }

    const response = await httpClient.request<TResponse>(config)
    return response.data
  }
  catch (error) {
    if (axios.isAxiosError<ApiErrorPayload>(error)) {
      if (!error.response) {
        throw new ApiError('Tidak bisa terhubung ke server API. Cek backend berjalan dan CORS aktif.', 0)
      }

      const payload = error.response?.data
      const status = error.response?.status ?? 500
      const message = payload?.message ?? payload?.error ?? error.message ?? 'Request failed'
      throw new ApiError(message, status, payload)
    }

    throw new ApiError('Request failed', 500)
  }
}
