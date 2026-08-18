import type { ApiError } from '#shared/types/api'

/**
 * Extract the backend error `code` from a `useApiFetch` error ref.
 *
 * The shared interceptor throws a plain `ApiError`, but `useAsyncData`
 * wraps whatever it catches via h3's `createError()`, which copies
 * `status` into `statusCode` and keeps the original object only as
 * `cause` — the custom `code` field does not survive at the top level.
 * Reading `error.value.code` directly therefore always yields
 * `undefined` and silently disables code-based branches (e.g. the
 * `vl_lms_not_found` → 404 mapping). Imperative `useApi()` calls are
 * unaffected: their throw reaches the caller unwrapped, which is why
 * `resolveEnrollmentError` & co. read `.code` directly.
 */
export function apiErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null
  }
  const direct = (error as { code?: unknown }).code
  if (typeof direct === 'string') {
    return direct
  }
  const cause = (error as { cause?: unknown }).cause
  if (cause && typeof cause === 'object') {
    const code = (cause as ApiError).code
    if (typeof code === 'string') {
      return code
    }
  }
  return null
}
