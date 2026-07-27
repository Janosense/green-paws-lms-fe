import { defineStore } from 'pinia'
import type { ApiError, ApiEnvelope } from '#shared/types/api'
import type {
  AnswerData,
  QuizAttempt,
  QuizAttemptHistoryResponse,
  QuizAttemptStateResponse,
  QuizSavedAnswer,
  QuizSaveAnswerResponse
} from '#shared/types/quiz'
import { isQuizFinalizedError } from '~/utils/resolveQuizError'

export type QuizAttemptStatus = 'idle' | 'starting' | 'loaded' | 'submitting' | 'error'

/**
 * Phase 6.2 — per-quiz-slug attempt cache.
 *
 * Mirrors the single-flight pattern from `progress.ts` but keyed by quiz
 * slug. The store owns:
 *
 * - The cached attempt-state response per slug.
 * - The single-flight `start()` guard (multiple components calling
 *   `start(slug)` in the same tick share one `POST /attempts` round-trip).
 * - Optimistic answer updates: `saveAnswer()` patches the local cache
 *   first, then reconciles with the server response or rolls back on
 *   error.
 * - Pivot to results on backend "finalized" errors
 *   (`attempt_expired` / `attempt_already_finalized`): the response
 *   carries the finalized attempt payload, which replaces the cached
 *   one so the page re-renders into the results branch.
 *
 * @author Tymofii Synianskyi
 */
export const useQuizAttemptStore = defineStore('quizAttempt', () => {
  const attempts = ref<Record<string, QuizAttemptStateResponse>>({})
  const status = ref<Record<string, QuizAttemptStatus>>({})
  const errors = ref<Record<string, ApiError | null>>({})
  const history = ref<Record<string, QuizAttemptHistoryResponse>>({})
  const historyLoading = ref<Record<string, boolean>>({})

  const inFlightStarts = new Map<string, Promise<QuizAttemptStateResponse>>()
  const inFlightHistory = new Map<string, Promise<QuizAttemptHistoryResponse>>()

  // ---------------------------------------------------------------- getters

  function currentAttempt(slug: string): QuizAttemptStateResponse | null {
    return attempts.value[slug] ?? null
  }

  function isLoading(slug: string): boolean {
    const s = status.value[slug]
    return s === 'starting' || s === 'submitting'
  }

  function attemptHistory(slug: string): QuizAttemptHistoryResponse | null {
    return history.value[slug] ?? null
  }

  function isHistoryLoading(slug: string): boolean {
    return historyLoading.value[slug] === true
  }

  function getSavedAnswer(slug: string, questionId: number): QuizSavedAnswer | null {
    const cached = attempts.value[slug]
    if (!cached) return null
    return cached.saved_answers.find(a => a.question_id === questionId) ?? null
  }

  // ---------------------------------------------------------------- helpers

  function setAttempt(slug: string, response: QuizAttemptStateResponse): void {
    attempts.value = { ...attempts.value, [slug]: response }
  }

  function patchAttempt(slug: string, attempt: QuizAttempt): void {
    const existing = attempts.value[slug]
    if (!existing) {
      // Create a stub if absent — defensive; production paths always have
      // an existing entry by the time the server returns a finalized one.
      attempts.value = {
        ...attempts.value,
        [slug]: { attempt, questions: [], saved_answers: [] }
      }
      return
    }
    attempts.value = {
      ...attempts.value,
      [slug]: { ...existing, attempt }
    }
  }

  function setStatus(slug: string, value: QuizAttemptStatus): void {
    status.value = { ...status.value, [slug]: value }
  }

  function setError(slug: string, value: ApiError | null): void {
    errors.value = { ...errors.value, [slug]: value }
  }

  // ---------------------------------------------------------------- actions

  async function performStart(slug: string): Promise<QuizAttemptStateResponse> {
    const api = useApi()
    setStatus(slug, 'starting')
    try {
      const envelope = await api.post<ApiEnvelope<QuizAttemptStateResponse>>(
        `/vl/v1/quizzes/${slug}/attempts`
      )
      setAttempt(slug, envelope.data)
      setStatus(slug, 'loaded')
      setError(slug, null)
      return envelope.data
    } catch (caught) {
      setStatus(slug, 'error')
      setError(slug, caught as ApiError)
      throw caught
    }
  }

  function start(slug: string): Promise<QuizAttemptStateResponse> {
    const existing = inFlightStarts.get(slug)
    if (existing) return existing

    const promise = performStart(slug).finally(() => {
      inFlightStarts.delete(slug)
    })
    inFlightStarts.set(slug, promise)
    return promise
  }

  async function fetchState(slug: string, attemptId: number): Promise<QuizAttemptStateResponse> {
    const api = useApi()
    setStatus(slug, 'starting')
    try {
      const envelope = await api.get<ApiEnvelope<QuizAttemptStateResponse>>(
        `/vl/v1/quizzes/attempts/${attemptId}`
      )
      setAttempt(slug, envelope.data)
      setStatus(slug, 'loaded')
      setError(slug, null)
      return envelope.data
    } catch (caught) {
      setStatus(slug, 'error')
      setError(slug, caught as ApiError)
      throw caught
    }
  }

  /**
   * Optimistic upsert of a saved answer, then PATCH to the server.
   *
   * On `attempt_expired` / `attempt_already_finalized` the backend
   * returns the finalized attempt as `data.attempt` on the WP_Error
   * payload — extract it and replace the cached attempt so the page
   * pivots to results.
   *
   * On any other error, roll back the optimistic write to whatever was
   * stored before the call (or remove the entry entirely if there was
   * none) and propagate the error to the caller.
   */
  async function saveAnswer(
    slug: string,
    questionId: number,
    answerData: AnswerData
  ): Promise<QuizSaveAnswerResponse> {
    const cached = attempts.value[slug]
    if (!cached) {
      throw new Error('quiz attempt not loaded for slug ' + slug)
    }
    const attemptId = cached.attempt.id

    // Snapshot the prior entry so we can roll back on error.
    const priorAnswer = cached.saved_answers.find(a => a.question_id === questionId) ?? null
    const optimistic: QuizSavedAnswer = {
      question_id: questionId,
      answer_data: answerData,
      answered_at: new Date().toISOString(),
      is_correct: priorAnswer?.is_correct ?? null,
      points_awarded: priorAnswer?.points_awarded ?? null
    }
    setAttempt(slug, withAnswerUpserted(cached, optimistic))

    const api = useApi()
    try {
      const envelope = await api.patch<ApiEnvelope<QuizSaveAnswerResponse>>(
        `/vl/v1/quizzes/attempts/${attemptId}/answers/${questionId}`,
        { answer_data: answerData }
      )
      const result = envelope.data
      if (result.expired && result.attempt) {
        // Pivot to finalized state — the controller carries the same payload
        // the fetch endpoint would have returned.
        patchAttempt(slug, result.attempt)
      } else if (result.answer) {
        const next = withAnswerUpserted(attempts.value[slug] ?? cached, result.answer)
        setAttempt(slug, next)
      }
      return result
    } catch (caught) {
      if (isQuizFinalizedError(caught)) {
        const finalizedAttempt = extractFinalizedAttempt(caught)
        if (finalizedAttempt) {
          patchAttempt(slug, finalizedAttempt)
          // Strip the optimistic answer — the attempt is finalized, no
          // pending save belongs in the cache.
          rollbackAnswer(slug, questionId, priorAnswer)
          return { answer: null, expired: true, attempt: finalizedAttempt }
        }
      }
      // Generic rollback path.
      rollbackAnswer(slug, questionId, priorAnswer)
      setError(slug, caught as ApiError)
      throw caught
    }
  }

  /**
   * Load the learner's attempt log for a quiz.
   *
   * Single-flight like `start()`: the results screen mounts the history
   * panel while other components may also ask, and one round-trip is
   * enough. Failures are swallowed into `null` rather than thrown — the
   * log is supplementary to the results already on screen, so a failed
   * fetch should collapse the panel, not break the page. `errors[slug]`
   * is deliberately left alone for the same reason: it drives the
   * player's error branch, and a history hiccup must not trip it.
   */
  async function performFetchHistory(slug: string): Promise<QuizAttemptHistoryResponse> {
    const api = useApi()
    historyLoading.value = { ...historyLoading.value, [slug]: true }
    try {
      const envelope = await api.get<ApiEnvelope<QuizAttemptHistoryResponse>>(
        `/vl/v1/quizzes/${slug}/attempts`
      )
      history.value = { ...history.value, [slug]: envelope.data }
      return envelope.data
    } finally {
      historyLoading.value = { ...historyLoading.value, [slug]: false }
    }
  }

  function fetchHistory(slug: string): Promise<QuizAttemptHistoryResponse> {
    const existing = inFlightHistory.get(slug)
    if (existing) return existing

    const promise = performFetchHistory(slug).finally(() => {
      inFlightHistory.delete(slug)
    })
    inFlightHistory.set(slug, promise)
    return promise
  }

  async function submit(slug: string): Promise<QuizAttemptStateResponse> {
    const cached = attempts.value[slug]
    if (!cached) {
      throw new Error('quiz attempt not loaded for slug ' + slug)
    }
    const attemptId = cached.attempt.id

    const api = useApi()
    setStatus(slug, 'submitting')
    try {
      const envelope = await api.post<ApiEnvelope<QuizAttemptStateResponse>>(
        `/vl/v1/quizzes/attempts/${attemptId}/submit`
      )
      setAttempt(slug, envelope.data)
      setStatus(slug, 'loaded')
      setError(slug, null)
      // This submit is itself a new history row. Drop the cached log so the
      // results screen's panel fetches one that includes the attempt the
      // learner is looking at, rather than the log as of before it.
      invalidateHistory(slug)
      return envelope.data
    } catch (caught) {
      setStatus(slug, 'error')
      setError(slug, caught as ApiError)
      throw caught
    }
  }

  function invalidateHistory(slug: string): void {
    history.value = filteredOut(history.value, slug)
  }

  function clear(slug: string): void {
    attempts.value = filteredOut(attempts.value, slug)
    status.value = filteredOut(status.value, slug)
    errors.value = filteredOut(errors.value, slug)
    history.value = filteredOut(history.value, slug)
    historyLoading.value = filteredOut(historyLoading.value, slug)
    inFlightStarts.delete(slug)
    inFlightHistory.delete(slug)
  }

  function filteredOut<T>(record: Record<string, T>, key: string): Record<string, T> {
    if (!(key in record)) return record
    const next: Record<string, T> = {}
    for (const k in record) {
      if (k !== key) next[k] = record[k] as T
    }
    return next
  }

  function clearAll(): void {
    attempts.value = {}
    status.value = {}
    errors.value = {}
    history.value = {}
    historyLoading.value = {}
    inFlightStarts.clear()
    inFlightHistory.clear()
  }

  // ---------------------------------------------------------------- internals

  function withAnswerUpserted(
    state: QuizAttemptStateResponse,
    next: QuizSavedAnswer
  ): QuizAttemptStateResponse {
    const existingIdx = state.saved_answers.findIndex(a => a.question_id === next.question_id)
    const saved
      = existingIdx === -1
        ? [...state.saved_answers, next]
        : state.saved_answers.map((a, i) => (i === existingIdx ? next : a))
    return { ...state, saved_answers: saved }
  }

  function rollbackAnswer(
    slug: string,
    questionId: number,
    prior: QuizSavedAnswer | null
  ): void {
    const current = attempts.value[slug]
    if (!current) return
    if (prior) {
      setAttempt(slug, withAnswerUpserted(current, prior))
    } else {
      const filtered = current.saved_answers.filter(a => a.question_id !== questionId)
      setAttempt(slug, { ...current, saved_answers: filtered })
    }
  }

  function extractFinalizedAttempt(err: unknown): QuizAttempt | null {
    if (!err || typeof err !== 'object') return null
    const data = (err as { data?: unknown }).data
    if (!data || typeof data !== 'object') return null
    const attempt = (data as { attempt?: unknown }).attempt
    if (!attempt || typeof attempt !== 'object') return null
    return attempt as QuizAttempt
  }

  return {
    // state
    attempts,
    status,
    errors,
    history,
    historyLoading,
    // getters / accessors
    currentAttempt,
    isLoading,
    getSavedAnswer,
    attemptHistory,
    isHistoryLoading,
    // actions
    start,
    fetchState,
    saveAnswer,
    submit,
    fetchHistory,
    invalidateHistory,
    clear,
    clearAll
  }
})
