import type { ComputedRef, Ref } from 'vue'
import type {
  AnswerData,
  QuizQuestionType,
  QuizSaveAnswerResponse
} from '#shared/types/quiz'

/**
 * Phase 6.2 — per-question debounce + flush-on-navigation.
 *
 * Saving semantics differ by question type:
 *
 * - `single_choice` / `multiple_choice` / `true_false`:
 *   `schedule(data)` fires `onSave` immediately. There is no debounce —
 *   selection events are intentional and infrequent.
 * - `text`:
 *   `schedule(data)` resets a 1500 ms timer. The user has to pause
 *   typing for 1.5 s before the save fires; alternatively `flush()`
 *   from a parent (prev/next click, blur, submit) cancels the timer
 *   and saves the latest payload immediately.
 *
 * `flush()` always sends the freshest payload that `schedule()` saw.
 * Errors propagate to the parent for toast display — the composable
 * does not retry; it just clears the pending flag.
 *
 * @author Tymofii Synianskyi
 */

export interface UseQuizAutosaveOptions {
  questionId: MaybeRefOrGetter<number>
  questionType: ComputedRef<QuizQuestionType>
  onSave: (data: AnswerData) => Promise<QuizSaveAnswerResponse>
}

export interface UseQuizAutosaveResult {
  schedule: (data: AnswerData) => void
  flush: () => Promise<void>
  hasPendingFlush: Ref<boolean>
}

const TEXT_DEBOUNCE_MS = 1500

export function useQuizAutosave(options: UseQuizAutosaveOptions): UseQuizAutosaveResult {
  const hasPendingFlush = ref(false)

  let timeoutId: number | null = null
  let latestData: AnswerData | null = null
  let inFlight: Promise<unknown> | null = null

  function clearTimer(): void {
    if (timeoutId !== null && typeof window !== 'undefined') {
      window.clearTimeout(timeoutId)
    }
    timeoutId = null
  }

  async function send(data: AnswerData): Promise<void> {
    hasPendingFlush.value = true
    const promise = options.onSave(data).catch(() => {
      // Swallowed: parent surfaces the error via the store's `errors` map
      // or a toast on the calling code path. Composable just clears state.
    })
    inFlight = promise
    try {
      await promise
    } finally {
      inFlight = null
      // Only clear the spinner when no further data has been queued
      // behind the current send. If `schedule()` was called again while
      // the network call was in flight, `latestData` will differ — leave
      // the flag on; the next save loop clears it.
      if (latestData === data) {
        hasPendingFlush.value = false
      }
    }
  }

  function schedule(data: AnswerData): void {
    latestData = data
    if (options.questionType.value === 'text') {
      clearTimer()
      hasPendingFlush.value = true
      if (typeof window !== 'undefined') {
        timeoutId = window.setTimeout(() => {
          timeoutId = null
          if (latestData) {
            void send(latestData)
          }
        }, TEXT_DEBOUNCE_MS)
      }
      return
    }
    void send(data)
  }

  async function flush(): Promise<void> {
    clearTimer()
    if (inFlight) {
      // Wait for any save already in flight first, so the order of
      // PATCH writes matches the user's input order.
      try {
        await inFlight
      } catch {
        // ignored — parent owns error surfacing
      }
    }
    if (latestData !== null) {
      await send(latestData)
    }
  }

  // Reset everything when the question id changes — the parent typically
  // unmounts the per-question card, but in shared host setups (single
  // mounted card with a swapping prop) this guard prevents a stale
  // pending save from firing under the new question id.
  watch(
    () => toValue(options.questionId),
    () => {
      clearTimer()
      latestData = null
      hasPendingFlush.value = false
    }
  )

  onBeforeUnmount(() => {
    clearTimer()
  })

  return {
    schedule,
    flush,
    hasPendingFlush
  }
}
