import type { FetchContext, FetchOptions } from 'ofetch'
import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack/types'
import type { ApiError } from '#shared/types/api'

type ApiFetchOptions = NitroFetchOptions<NitroFetchRequest>
type ApiCallOptions = Omit<ApiFetchOptions, 'method'>
type ApiBody = ApiFetchOptions['body']

function normalizeFetchError(ctx: FetchContext): ApiError {
  const status = ctx.response?.status ?? 0
  const data = ctx.response?._data

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
    message: ctx.error?.message || 'Network request failed',
    status
  }
}

type SharedApiFetchOptions = Pick<
  FetchOptions,
  'baseURL' | 'headers' | 'onRequest' | 'onRequestError' | 'onResponseError'
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
    headers: { Accept: 'application/json' },

    onRequest(_ctx) {
      // TODO (Phase 2): inject `Authorization: Bearer <token>` from auth store.
      //   const auth = useAuthStore()
      //   if (auth.token) _ctx.options.headers.set('Authorization', `Bearer ${auth.token}`)
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
export const useApiFetch = createUseFetch((currentOptions) => {
  const base = buildApiFetchOptions()
  return {
    ...base,
    ...currentOptions,
    headers: {
      ...(base.headers as Record<string, string>),
      ...(currentOptions.headers as Record<string, string> | undefined)
    }
  }
})

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
