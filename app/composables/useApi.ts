import type { FetchError } from 'ofetch'
import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack/types'
import type { ApiError } from '#shared/types/api'

type ApiFetchOptions = NitroFetchOptions<NitroFetchRequest>
type ApiCallOptions = Omit<ApiFetchOptions, 'method'>
type ApiBody = ApiFetchOptions['body']

/**
 * Base composable for talking to the WordPress REST API.
 *
 * Phase 0: HTTP client wrapper with base URL resolution and error normalization.
 * Phase 2: will be extended with JWT Authorization header injection and
 *          401 refresh flow via an interceptor pattern.
 */
export function useApi() {
  const config = useRuntimeConfig()

  // Prefer internal URL on server (future-proofing for Docker setups).
  // On Phase 0 both are the same; internal is reserved.
  const baseURL = import.meta.server && config.wpApiBaseInternal
    ? config.wpApiBaseInternal
    : config.public.wpApiBase

  const request = async <T>(
    path: string,
    options: ApiFetchOptions = {}
  ): Promise<T> => {
    try {
      return await $fetch<T>(path, {
        baseURL,
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.headers as Record<string, string> | undefined)
        }
      })
    } catch (err) {
      throw normalizeError(err as FetchError)
    }
  }

  return {
    get: <T>(path: string, options?: ApiCallOptions) =>
      request<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, body?: ApiBody, options?: ApiCallOptions) =>
      request<T>(path, { ...options, method: 'POST', body }),
    put: <T>(path: string, body?: ApiBody, options?: ApiCallOptions) =>
      request<T>(path, { ...options, method: 'PUT', body }),
    patch: <T>(path: string, body?: ApiBody, options?: ApiCallOptions) =>
      request<T>(path, { ...options, method: 'PATCH', body }),
    delete: <T>(path: string, options?: ApiCallOptions) =>
      request<T>(path, { ...options, method: 'DELETE' })
  }
}

function normalizeError(err: FetchError): ApiError {
  const status = err.response?.status ?? 0
  const data = err.response?._data

  // WP REST API standard error shape: { code, message, data: { status } }
  if (data && typeof data === 'object' && 'code' in data && 'message' in data) {
    return {
      code: String(data.code),
      message: String(data.message),
      status,
      data: 'data' in data ? data.data : undefined
    }
  }

  return {
    code: 'network_error',
    message: err.message || 'Network request failed',
    status
  }
}
