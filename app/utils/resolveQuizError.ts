import type { ApiError } from '#shared/types/api'

/**
 * Map a backend quiz error code (Phase 6.1 §7.3) to its i18n key plus
 * presentation hints.
 *
 * `fatal=true` means "the player can't proceed — render an ErrorState
 * branch and offer a navigation escape". `fatal=false` means "show an
 * inline toast and let the user retry the action".
 *
 * Note that `attempt_expired` and `attempt_already_finalized` are NOT
 * fatal even though they share the 409 status with `attempts_exhausted`:
 * the store handles them by replacing the cached attempt with the
 * finalized payload from the response, which pivots the page to the
 * results screen on the next render. Use {@link isQuizFinalizedError}
 * to detect that path.
 *
 * @author Tymofii Synianskyi
 */

export interface QuizErrorResolution {
  key: string
  status: number
  fatal: boolean
}

const FATAL_CODES = new Set<string>([
  'unauthenticated',
  'forbidden',
  'rest_forbidden',
  'rest_not_logged_in',
  'quiz_not_found',
  'quiz_not_published',
  'quiz_not_in_course',
  'not_enrolled',
  'attempts_exhausted',
  'attempt_not_found',
  'progression_locked',
  'course_quizzes_incomplete',
  'previous_incomplete'
])

const FINALIZED_CODES = new Set<string>([
  'attempt_expired',
  'attempt_already_finalized'
])

const KEY_BY_CODE: Readonly<Record<string, string>> = {
  unauthenticated: 'quiz.errors.unauthenticated',
  rest_not_logged_in: 'quiz.errors.unauthenticated',
  forbidden: 'quiz.errors.forbidden',
  rest_forbidden: 'quiz.errors.forbidden',
  quiz_not_found: 'quiz.errors.notFound',
  quiz_not_published: 'quiz.errors.notFound',
  quiz_not_in_course: 'quiz.errors.misconfigured',
  not_enrolled: 'quiz.errors.notEnrolled',
  attempts_exhausted: 'quiz.errors.attemptsExhausted',
  progression_locked: 'quiz.errors.progressionLocked',
  course_quizzes_incomplete: 'quiz.errors.courseQuizzesIncomplete',
  previous_incomplete: 'quiz.errors.previousIncomplete',
  attempt_not_found: 'quiz.errors.attemptNotFound',
  attempt_expired: 'quiz.errors.expired',
  attempt_already_finalized: 'quiz.errors.alreadyFinalized',
  invalid_question_id: 'quiz.errors.invalidQuestion',
  invalid_answer_data: 'quiz.errors.invalidAnswer',
  internal_error: 'quiz.errors.internal'
}

const GENERIC: QuizErrorResolution = {
  key: 'quiz.errors.internal',
  status: 0,
  fatal: false
}

export function resolveQuizError(error: ApiError | null | unknown): QuizErrorResolution {
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

/**
 * `true` when the error means the attempt has been finalized server-side
 * (time-limit expiry on save, or a late save against an already-submitted
 * attempt). The store uses this to swap its cached attempt for the
 * finalized payload that the backend includes in the error response.
 */
export function isQuizFinalizedError(error: ApiError | null | unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' && FINALIZED_CODES.has(code)
}
