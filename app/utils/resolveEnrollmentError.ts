import type { ApiError } from '#shared/types/api'

/**
 * Map a backend enrollment error code to its i18n key under
 * `enrollment.errors.*`. Mirrors `resolveAuthError` in shape.
 *
 * Codes are owned by `vl-lms` (see `EnrollmentsController`) and are stable
 * — frontend never reads `error.message` directly because the backend
 * messages are English by design.
 */
const KNOWN_CODES: Readonly<Record<string, string>> = {
  payment_required: 'enrollment.errors.payment_required',
  enrollment_closed: 'enrollment.errors.closed',
  enrollment_not_open: 'enrollment.errors.not_open',
  enrollment_full: 'enrollment.errors.full',
  course_not_found: 'enrollment.errors.not_found',
  rest_not_logged_in: 'enrollment.errors.unauthorized',
  rest_forbidden: 'enrollment.errors.forbidden'
}

const GENERIC_KEY = 'enrollment.errors.generic'

export function resolveEnrollmentError(error: ApiError | null | unknown): string {
  if (!error || typeof error !== 'object') {
    return GENERIC_KEY
  }
  const code = (error as { code?: unknown }).code
  if (typeof code === 'string' && code in KNOWN_CODES) {
    return KNOWN_CODES[code] ?? GENERIC_KEY
  }
  return GENERIC_KEY
}
