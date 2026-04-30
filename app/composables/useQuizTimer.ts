import type { ComputedRef, Ref } from 'vue'
import type { QuizAttempt } from '#shared/types/quiz'

/**
 * Phase 6.2 — countdown clock for the quiz player.
 *
 * Anchored on the attempt's `started_at + time_limit_seconds`, the timer
 * recomputes each tick from the wall clock so a backgrounded tab cannot
 * accumulate drift. When `time_limit_seconds === 0` the timer is
 * inert — no interval runs and `formatted` returns `'∞'`.
 *
 * `pause()` / `resume()` clear and recreate the interval but never reset
 * the anchor — the next `tick()` on resume reflects real elapsed wall
 * time. Components wire these to `visibilitychange` so the displayed
 * remaining time stays honest when the tab is hidden.
 *
 * `onExpire` fires exactly once per anchor. If the attempt prop changes
 * (e.g. start path returns a fresh attempt id), the anchor re-arms and
 * `onExpire` becomes eligible again.
 *
 * @author Tymofii Synianskyi
 */

export interface UseQuizTimerOptions {
  attempt: ComputedRef<QuizAttempt | null>
  onExpire: () => void
}

export interface UseQuizTimerResult {
  remaining: Ref<number>
  isUnlimited: ComputedRef<boolean>
  formatted: ComputedRef<string>
  pause: () => void
  resume: () => void
}

const TICK_MS = 1000

export function useQuizTimer({ attempt, onExpire }: UseQuizTimerOptions): UseQuizTimerResult {
  const remaining = ref<number>(0)
  const isUnlimited = computed<boolean>(() => {
    const a = attempt.value
    return !a || a.time_limit_seconds <= 0
  })

  let intervalId: number | null = null
  let expiresAt = 0
  let firedForAttemptId: number | null = null
  let anchorAttemptId: number | null = null

  function nowSeconds(): number {
    return Math.floor(Date.now() / 1000)
  }

  function recompute(): void {
    if (isUnlimited.value || expiresAt === 0) {
      remaining.value = 0
      return
    }
    const next = Math.max(0, expiresAt - nowSeconds())
    remaining.value = next

    if (next <= 0 && anchorAttemptId !== null && firedForAttemptId !== anchorAttemptId) {
      firedForAttemptId = anchorAttemptId
      stop()
      onExpire()
    }
  }

  function start(): void {
    if (intervalId !== null || isUnlimited.value) return
    if (typeof window === 'undefined') return
    intervalId = window.setInterval(recompute, TICK_MS)
  }

  function stop(): void {
    if (intervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(intervalId)
    }
    intervalId = null
  }

  function arm(a: QuizAttempt | null): void {
    stop()
    if (!a || a.time_limit_seconds <= 0) {
      anchorAttemptId = null
      expiresAt = 0
      remaining.value = 0
      return
    }
    anchorAttemptId = a.id
    const startedAt = Math.floor(new Date(a.started_at).getTime() / 1000)
    expiresAt = startedAt + a.time_limit_seconds
    recompute()
    if (remaining.value > 0) {
      start()
    }
  }

  function pause(): void {
    stop()
  }

  function resume(): void {
    if (isUnlimited.value) return
    recompute()
    if (remaining.value > 0) {
      start()
    }
  }

  watch(
    attempt,
    (current) => {
      arm(current)
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    stop()
  })

  const formatted = computed<string>(() => {
    if (isUnlimited.value) return '∞'
    const total = remaining.value
    if (total <= 0) return '0:00'
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
    return `${m}:${String(s).padStart(2, '0')}`
  })

  return {
    remaining,
    isUnlimited,
    formatted,
    pause,
    resume
  }
}
