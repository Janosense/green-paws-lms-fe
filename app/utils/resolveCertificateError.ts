import type { ApiError } from '#shared/types/api'

/**
 * Map a backend certificate error code (Phase 6.3) to an i18n key plus
 * presentation hints.
 *
 * `fatal=true` means "render an ErrorState branch and offer a navigation
 * escape"; `fatal=false` means "show an inline toast and let the user
 * retry the action". `certificate_revoked` is non-fatal because the detail
 * page renders in revoked state (banner + disabled download), and
 * `internal_error` is non-fatal so the user can hit "Спробувати ще".
 *
 * @author Tymofii Synianskyi
 */

export interface CertificateErrorResolution {
  key: string
  status: number
  fatal: boolean
}

const FATAL_CODES = new Set<string>([
  'unauthenticated',
  'rest_not_logged_in',
  'forbidden',
  'rest_forbidden',
  'certificate_not_found'
])

const KEY_BY_CODE: Readonly<Record<string, string>> = {
  unauthenticated: 'certificate.errors.unauthenticated',
  rest_not_logged_in: 'certificate.errors.unauthenticated',
  forbidden: 'certificate.errors.forbidden',
  rest_forbidden: 'certificate.errors.forbidden',
  certificate_not_found: 'certificate.errors.notFound',
  certificate_revoked: 'certificate.errors.revoked',
  internal_error: 'certificate.errors.internal'
}

const GENERIC: CertificateErrorResolution = {
  key: 'certificate.errors.internal',
  status: 0,
  fatal: false
}

export function resolveCertificateError(
  error: ApiError | null | unknown
): CertificateErrorResolution {
  if (!error || typeof error !== 'object') {
    return GENERIC
  }
  const code = (error as { code?: unknown }).code
  const status = (error as { status?: unknown }).status
  if (typeof code !== 'string') {
    return GENERIC
  }
  const key = KEY_BY_CODE[code] ?? GENERIC.key
  return {
    key,
    status: typeof status === 'number' ? status : GENERIC.status,
    fatal: FATAL_CODES.has(code)
  }
}
