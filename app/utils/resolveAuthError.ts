import type { ApiError } from '#shared/types/api'

/**
 * Allow-list of backend error codes that have a Ukrainian translation in
 * `errors.<code>` of `i18n/locales/uk.json`. Built from `PHASE-2-AUDIT.md`
 * §1, §4, §7, §12, §13. Codes outside this set fall through to a generic
 * "unknown error" message — backend `error.message` is English and must
 * never be rendered directly.
 *
 * Keep this list and the `errors.*` block in `uk.json` in lockstep.
 */
const KNOWN_AUTH_ERROR_CODES: readonly string[] = [
  // vl-jwt-auth (vl-auth/v1) — token endpoints
  'invalid_credentials',
  'incorrect_password',
  'invalid_username',
  'invalid_email',
  'empty_username',
  'empty_password',
  'rate_limit_exceeded',
  'invalid_origin',
  'user_not_found',
  'not_found',
  'token_invalid',
  'token_expired',
  'refresh_token_invalid',
  'refresh_token_reused',
  'refresh_token_required',

  // vl-lms (vl/v1/auth/*)
  'vl_lms_email_not_verified',
  'vl_lms_invalid_email',
  'vl_lms_invalid_first_name',
  'vl_lms_invalid_last_name',
  'vl_lms_invalid_account_kind',
  'vl_lms_weak_password',
  'vl_lms_registration_failed',
  'vl_lms_verification_invalid',
  'vl_lms_verification_expired',
  'vl_lms_verification_already_verified',
  'vl_lms_verification_user_missing',
  'vl_lms_password_reset_invalid_token',
  'vl_lms_password_reset_token_expired',
  'vl_lms_password_reset_weak_password',

  // frontend-only synthetic codes from the interceptor's normalizer
  'network_error'
] as const

/**
 * Map an `ApiError` to an i18n key under the `errors.*` namespace.
 * Returns `errors.unknown_error` for null input or unknown codes.
 *
 * Forms and toast call sites use `$t(resolveAuthError(error))` to render
 * a localized message. They never read `error.message` directly.
 */
export function resolveAuthError(error: ApiError | null | undefined): string {
  if (!error) {
    return 'errors.unknown_error'
  }
  if (error.code && KNOWN_AUTH_ERROR_CODES.includes(error.code)) {
    return `errors.${error.code}`
  }
  if (import.meta.dev) {
    // Surface unmapped codes in dev so we can add the translation. Quiet in prod.
    console.warn(`[resolveAuthError] unmapped error code: "${error.code}" (status ${error.status})`)
  }
  return 'errors.unknown_error'
}

/**
 * Type guard for ApiError. Useful in `catch (e)` blocks where `e: unknown`.
 */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object'
    && value !== null
    && 'code' in value
    && 'message' in value
    && 'status' in value
  )
}
