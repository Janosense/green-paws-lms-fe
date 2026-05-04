import type { ApiError } from '#shared/types/api'

/**
 * Phase 7.6 — map a backend session-access error to its i18n key.
 * Mirrors `resolveWebinarError` shape.
 */
export interface ResolvedSessionError {
  key: string
  status: number
  fatal: boolean
}

interface CodeRule {
  key: string
  fatal: boolean
}

const CODE_TABLE: Readonly<Record<string, CodeRule>> = {
  session_not_found: { key: 'learn.session.errors.session_not_found', fatal: true },
  not_enrolled: { key: 'learn.session.errors.not_enrolled', fatal: true },
  session_cancelled: { key: 'learn.session.errors.session_cancelled', fatal: true },
  meeting_not_provisioned: { key: 'learn.session.errors.meeting_not_provisioned', fatal: false },
  join_window_not_open: { key: 'learn.session.errors.join_window_not_open', fatal: false },
  join_window_closed: { key: 'learn.session.errors.join_window_closed', fatal: true },
  recording_not_available: { key: 'learn.session.errors.recording_not_available', fatal: true },
  recording_window_expired: { key: 'learn.session.errors.recording_window_expired', fatal: true },
  network_error: { key: 'learn.session.errors.network_error', fatal: false }
}

const FALLBACK: ResolvedSessionError = {
  key: 'learn.session.errors.unknown',
  status: 0,
  fatal: true
}

export function resolveSessionError(error: ApiError | null | unknown): ResolvedSessionError {
  if (!error || typeof error !== 'object') {
    return FALLBACK
  }
  const status = typeof (error as { status?: unknown }).status === 'number'
    ? (error as { status: number }).status
    : 0
  const code = typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : null
  if (code !== null && code in CODE_TABLE) {
    const rule = CODE_TABLE[code]!
    return { key: rule.key, status, fatal: rule.fatal }
  }
  return { ...FALLBACK, status }
}
