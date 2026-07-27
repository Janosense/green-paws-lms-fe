import type { MaybeRefOrGetter } from 'vue'
import type { CurriculumNodeLock } from '#shared/types/learn'

/**
 * Resolves a node's lock into the bits a rail row needs to render it.
 *
 * Shared by `CurriculumRailLeaf` and `CurriculumRailQuizLeaf`, which show
 * the same padlock treatment but differ in trailing label and indent —
 * enough that a wrapper component would be more awkward than a composable.
 *
 * The lock itself is computed server-side and arrives on the node; nothing
 * here re-derives it. See `CurriculumNodeLock` in `#shared/types/learn`.
 */
export function useCurriculumLock(lock: MaybeRefOrGetter<CurriculumNodeLock | null>) {
  const { t } = useI18n()

  const isLocked = computed(() => toValue(lock) !== null)

  const tooltipText = computed(() => {
    const value = toValue(lock)
    if (!value) {
      return ''
    }
    if (value.reason === 'course_quizzes_incomplete') {
      return t('learn.rail.locked_prerequisites', { count: value.remaining_quiz_count })
    }
    // `blocking_quiz` is always present on a progression lock, but fall back
    // rather than render an empty quoted title if the payload ever changes.
    return value.blocking_quiz
      ? t('learn.rail.locked_by_quiz', { quiz: value.blocking_quiz.title })
      : t('learn.rail.locked_generic')
  })

  return { isLocked, tooltipText }
}
