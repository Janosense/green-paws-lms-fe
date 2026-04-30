import type { ApiError } from '#shared/types/api'
import type {
  AnswerData,
  QuizAttemptStateResponse,
  QuizSaveAnswerResponse
} from '#shared/types/quiz'

/**
 * Phase 6.2 — thin façade over `useQuizAttemptStore`.
 *
 * Components consume this rather than touching the store directly so the
 * route's slug is bound once and the resulting actions are
 * argument-free. The store still owns state — this composable is pure
 * pass-through plus one or two reactive accessors.
 *
 * @author Tymofii Synianskyi
 */
export function useQuizAttempt(slug: MaybeRefOrGetter<string>) {
  const store = useQuizAttemptStore()

  const state = computed<QuizAttemptStateResponse | null>(() =>
    store.currentAttempt(toValue(slug))
  )

  const isLoading = computed<boolean>(() => store.isLoading(toValue(slug)))

  const error = computed<ApiError | null>(() => store.errors[toValue(slug)] ?? null)

  function start(): Promise<QuizAttemptStateResponse> {
    return store.start(toValue(slug))
  }

  function saveAnswer(questionId: number, data: AnswerData): Promise<QuizSaveAnswerResponse> {
    return store.saveAnswer(toValue(slug), questionId, data)
  }

  function submit(): Promise<QuizAttemptStateResponse> {
    return store.submit(toValue(slug))
  }

  return {
    state,
    isLoading,
    error,
    start,
    saveAnswer,
    submit
  }
}
