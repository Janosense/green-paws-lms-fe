import type { FetchContext, FetchOptions } from 'ofetch'
import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack/types'
import type { ApiError } from '#shared/types/api'

/**
 * Internal extension over Nitro's fetch options:
 * - `auth: false` opts a request out of `Authorization: Bearer` injection
 *   (used by /vl-auth/v1/token, /token/refresh, /vl/v1/auth/* public flows).
 * - `__retried: true` is the sentinel that marks the second pass after a
 *   refresh-and-retry, so a recursive 401 does not loop.
 */
type ApiFetchOptions = NitroFetchOptions<NitroFetchRequest> & {
  auth?: boolean
  __retried?: boolean
}
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

  // vl-auth/v1 (vl-jwt-auth) envelope: { success: false, error: { code, message, status } }
  if (
    data
    && typeof data === 'object'
    && 'error' in data
    && data.error
    && typeof data.error === 'object'
    && 'code' in data.error
    && 'message' in data.error
  ) {
    const err = data.error as { code: unknown, message: unknown }
    return {
      code: String(err.code),
      message: String(err.message),
      status
    }
  }

  // WP-REST default envelope (vl-lms /vl/v1/auth/*): { code, message, data: { status } }
  if (data && typeof data === 'object' && 'code' in data && 'message' in data) {
    return {
      code: String(data.code),
      message: String(data.message),
      status,
      data: 'data' in data ? data.data : undefined
    }
  }

  // Got a response but not a recognised envelope (e.g. 500 HTML page, nginx 502)
  return {
    code: `http_${status}`,
    message: `Request failed with status ${status}`,
    status
  }
}

type SharedApiFetchOptions = Pick<
  FetchOptions,
  'baseURL' | 'credentials' | 'onRequest' | 'onRequestError' | 'onResponseError'
>

/**
 * Single source of truth for API fetch configuration shared between
 * `useApi()` (imperative) and `useApiFetch` (declarative). Header injection,
 * SSR cookie passthrough, and error normalization live here. The 401
 * refresh-and-retry layer is added on top by `createApiFetch()` below.
 *
 * `credentials: 'include'` is set globally so the path-scoped refresh cookie
 * attaches to /vl-auth/v1/* calls. The cookie is path-scoped on the backend
 * (see PHASE-2-AUDIT §3) so it never leaks to /vl/v1/* endpoints.
 */
function buildApiFetchOptions(): SharedApiFetchOptions {
  const config = useRuntimeConfig()

  // Prefer internal URL on server (future-proofing for Docker setups).
  const baseURL = import.meta.server && config.wpApiBaseInternal
    ? config.wpApiBaseInternal
    : config.public.wpApiBase

  return {
    baseURL,
    credentials: 'include',

    onRequest(ctx) {
      ctx.options.headers.set('Accept', 'application/json')

      // SSR: the browser is not in the loop, so the refresh cookie lives in
      // the incoming request headers. Forward it on outgoing API calls so
      // /vl-auth/v1/refresh and /logout still see it.
      if (import.meta.server) {
        const incoming = useRequestHeaders(['cookie'])
        if (incoming.cookie && !ctx.options.headers.has('cookie')) {
          ctx.options.headers.set('cookie', incoming.cookie)
        }
      }

      const opts = ctx.options as ApiFetchOptions
      if (opts.auth !== false) {
        const authStore = useAuthStore()
        const token = authStore.accessToken?.value
        if (token) {
          ctx.options.headers.set('Authorization', `Bearer ${token}`)
        }
      }

      // `auth` and `__retried` are wrapper-internal flags — strip them so
      // they never reach the underlying Fetch call.
      delete opts.auth
    },

    onRequestError(ctx) {
      throw normalizeFetchError(ctx)
    },

    onResponseError(ctx) {
      throw normalizeFetchError(ctx)
    }
  }
}

type ApiClientFetch = <T>(request: NitroFetchRequest, options?: ApiFetchOptions) => Promise<T>

/**
 * Build a fetch function that adds 401 refresh-and-retry on top of the
 * shared interceptor pipeline. Concurrent 401s are coalesced through the
 * auth store's single-flight `refresh()`, so N parallel requests trigger
 * exactly one /token/refresh round-trip.
 *
 * Retry happens at the wrapper layer (rather than inside `onResponseError`)
 * because ofetch always throws after `onResponseError` resolves — there is
 * no supported way to swap a failed response with a successful retry from
 * inside the interceptor itself. The shared interceptor still normalizes
 * the error; we only inspect its status here.
 */
function createApiFetch(): ApiClientFetch {
  const baseFetch = $fetch.create(buildApiFetchOptions())

  return async <T>(request: NitroFetchRequest, options: ApiFetchOptions = {}): Promise<T> => {
    try {
      return await baseFetch<T>(request, options as NitroFetchOptions<NitroFetchRequest>)
    } catch (error) {
      const apiError = error as ApiError
      const canRetry
        = apiError?.status === 401
          && options.auth !== false
          && options.__retried !== true

      if (!canRetry) {
        throw error
      }

      const authStore = useAuthStore()
      try {
        await authStore.refresh()
      } catch {
        // Refresh failed: the store has cleared its own state. Surface the
        // original 401 to the caller and, on the client, kick the user back
        // to /login. SSR has no router redirect target here — the page
        // render will surface the auth-less state via the boot plugin.
        if (import.meta.client) {
          await navigateTo('/login')
        }
        throw error
      }

      const retryOptions = { ...options, __retried: true }
      return await baseFetch<T>(request, retryOptions as NitroFetchOptions<NitroFetchRequest>)
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
 * from event handlers, store actions, or anywhere outside the useFetch flow.
 */
export function useApi() {
  const apiFetch = createApiFetch()

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
