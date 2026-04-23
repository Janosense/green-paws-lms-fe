import type { FetchContext, FetchOptions } from 'ofetch'
import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack/types'
import type { ApiError } from '#shared/types/api'

type ApiFetchOptions = NitroFetchOptions<NitroFetchRequest>
type ApiCallOptions = Omit<ApiFetchOptions, 'method'>
type ApiBody = ApiFetchOptions['body']

function normalizeFetchError(ctx: FetchContext): ApiError {
  const status = ctx.response?.status ?? 0

  // No response = network-level failure (DNS, CORS, offline, connection refused)
  if (!ctx.response) {
    return {
      code: 'network_error',
      message: ctx.error?.message || 'Unable to reach the API. Is the backend running?',
      status: 0
    }
  }

  const data = ctx.response._data

  if (data && typeof data === 'object' && 'code' in data && 'message' in data) {
    return {
      code: String(data.code),
      message: String(data.message),
      status,
      data: 'data' in data ? data.data : undefined
    }
  }

  // Got a response but not WP-shaped (e.g. 500 HTML error page, nginx 502)
  return {
    code: `http_${status}`,
    message: `Request failed with status ${status}`,
    status
  }
}

type SharedApiFetchOptions = Pick<
  FetchOptions,
  'baseURL' | 'onRequest' | 'onRequestError' | 'onResponseError'
>

/**
 * Single source of truth for API fetch configuration.
 * Resolves baseURL (internal on SSR, public elsewhere) and installs the
 * interceptor seams that Phase 2 auth will plug into.
 */
function buildApiFetchOptions(): SharedApiFetchOptions {
  const config = useRuntimeConfig()

  // Prefer internal URL on server (future-proofing for Docker setups).
  const baseURL = import.meta.server && config.wpApiBaseInternal
    ? config.wpApiBaseInternal
    : config.public.wpApiBase

  return {
    baseURL,

    onRequest(ctx) {
      ctx.options.headers.set('Accept', 'application/json')
      // TODO (Phase 2): inject `Authorization: Bearer <token>` from auth store.
      //   const auth = useAuthStore()
      //   if (auth.token) ctx.options.headers.set('Authorization', `Bearer ${auth.token}`)
    },

    onRequestError(ctx) {
      throw normalizeFetchError(ctx)
    },

    onResponseError(ctx) {
      // TODO (Phase 2): on 401, attempt token refresh + retry once before throwing.
      //   if (ctx.response.status === 401) { await auth.refresh(); return retry(ctx) }
      throw normalizeFetchError(ctx)
    }
  }
}

/**
 * Declarative, SSR-integrated data fetching for the WordPress REST API.
 * Use in <script setup> for GETs that should participate in the payload:
 *   const { data, error, refresh } = await useApiFetch<HealthzResponse>('/vl/v1/healthz')
 */
export const useApiFetch = createUseFetch(currentOptions => ({
  ...buildApiFetchOptions(),
  ...currentOptions
}))

/**
 * Imperative client for mutations (POST/PUT/PATCH/DELETE) and one-shot calls
 * from event handlers or form submits — anywhere outside the useFetch flow.
 */
export function useApi() {
  const apiFetch = $fetch.create(buildApiFetchOptions())

  return {
    get: <T>(path: string, options?: ApiCallOptions) =>
      apiFetch<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, body?: ApiBody, options?: ApiCallOptions) =>
      apiFetch<T>(path, { ...options, method: 'POST', body }),
    put: <T>(path: string, body?: ApiBody, options?: ApiCallOptions) =>
      apiFetch<T>(path, { ...options, method: 'PUT', body }),
    patch: <T>(path: string, body?: ApiBody, options?: ApiCallOptions) =>
      apiFetch<T>(path, { ...options, method: 'PATCH', body }),
    delete: <T>(path: string, options?: ApiCallOptions) =>
      apiFetch<T>(path, { ...options, method: 'DELETE' })
  }
}
