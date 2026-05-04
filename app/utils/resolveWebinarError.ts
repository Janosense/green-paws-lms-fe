import type { ApiError } from '#shared/types/api'

/**
 * Resolved-error envelope for webinar flows. Includes status (so the caller
 * can pick toast vs. inline banner) and a `fatal` hint (whether the user
 * can recover via UI action — e.g. a registration-window-not-yet-open is
 * not fatal because the page will refresh once the window opens, while
 * `recording_window_expired` is fatal).
 */
export interface ResolvedWebinarError {
  key: string
  status: number
  fatal: boolean
}

interface CodeRule {
  key: string
  fatal: boolean
}

const CODE_TABLE: Readonly<Record<string, CodeRule>> = {
  webinar_not_found: { key: 'webinar.errors.webinar_not_found', fatal: true },
  registration_not_open_yet: { key: 'webinar.errors.registration_not_open_yet', fatal: false },
  registration_closed: { key: 'webinar.errors.registration_closed', fatal: true },
  payment_required: { key: 'webinar.errors.payment_required', fatal: true },
  capacity_reached: { key: 'webinar.errors.capacity_reached', fatal: true },
  join_window_not_open: { key: 'webinar.errors.join_window_not_open', fatal: false },
  join_window_closed: { key: 'webinar.errors.join_window_closed', fatal: true },
  meeting_not_provisioned: { key: 'webinar.errors.meeting_not_provisioned', fatal: false },
  recording_not_available: { key: 'webinar.errors.recording_not_available', fatal: true },
  recording_window_expired: { key: 'webinar.errors.recording_window_expired', fatal: true },
  network_error: { key: 'webinar.errors.network_error', fatal: false }
}

const FALLBACK: ResolvedWebinarError = {
  key: 'webinar.errors.unknown',
  status: 0,
  fatal: true
}

/**
 * Map a backend webinar error to its i18n key + presentation hints.
 *
 * `not_registered` is shared between two contexts: 409 (cancel a row that
 * is not active) vs 403 (try to access join/recording without an active
 * registration). The former is a stale-UI signal; the latter is an
 * access-control message that says "register first". The split is on
 * status, since the codes are identical.
 */
export function resolveWebinarError(error: ApiError | null | unknown): ResolvedWebinarError {
  if (!error || typeof error !== 'object') {
    return FALLBACK
  }
  const status = typeof (error as { status?: unknown }).status === 'number'
    ? (error as { status: number }).status
    : 0
  const code = typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : null

  if (code === 'not_registered') {
    return {
      key: status === 403
        ? 'webinar.errors.access_not_registered'
        : 'webinar.errors.not_registered',
      status,
      fatal: true
    }
  }

  if (code !== null && code in CODE_TABLE) {
    const rule = CODE_TABLE[code]!
    return { key: rule.key, status, fatal: rule.fatal }
  }

  return { ...FALLBACK, status }
}
