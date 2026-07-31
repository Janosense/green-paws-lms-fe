import type { ApiError } from '#shared/types/api'

export type LearnErrorScope = 'lesson' | 'topic'

/**
 * Map a backend learn error code to its i18n key under
 * `learn.{scope}.error.*` or `learn.{scope}.not_found.*`. The 404-class
 * codes return `not_found.*` keys so the page renders `<NotFound />`
 * instead of `<ErrorState>`.
 */
const NOT_FOUND_CODES: ReadonlySet<string> = new Set([
  'lesson_not_found',
  'topic_not_found',
  'parent_not_found',
  'course_unpublished'
])

/**
 * `progression_locked` is deliberately absent from `NOT_FOUND_CODES` above:
 * the backend answers 403, and routing it to `<NotFound />` would tell an
 * enrolled learner that a lesson sitting in their own curriculum rail does
 * not exist.
 */
const ERROR_CODES: Readonly<
  Record<
    string,
    'not_enrolled' | 'unauthorized' | 'progression_locked' | 'course_quizzes_incomplete' | 'previous_incomplete'
  >
> = {
  not_enrolled: 'not_enrolled',
  progression_locked: 'progression_locked',
  course_quizzes_incomplete: 'course_quizzes_incomplete',
  previous_incomplete: 'previous_incomplete',
  rest_not_logged_in: 'unauthorized',
  rest_forbidden: 'unauthorized',
  unauthorized: 'unauthorized'
}

export function resolveLearnError(error: ApiError | null | unknown, scope: LearnErrorScope): string {
  if (!error || typeof error !== 'object') {
    return `learn.${scope}.error.description_default`
  }
  const code = (error as { code?: unknown }).code
  if (typeof code !== 'string') {
    return `learn.${scope}.error.description_default`
  }
  if (NOT_FOUND_CODES.has(code)) {
    return `learn.${scope}.not_found.description`
  }
  const mapped = ERROR_CODES[code]
  if (mapped) {
    return `learn.${scope}.error.description_${mapped}`
  }
  return `learn.${scope}.error.description_default`
}

export function isLearnNotFound(error: ApiError | null | unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' && NOT_FOUND_CODES.has(code)
}
