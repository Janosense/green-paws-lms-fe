<script setup lang="ts">
import type { CurriculumQuizNode } from '#shared/types/learn'
import { useCurriculumLock } from '~/composables/useCurriculumLock'

interface Props {
  quiz: CurriculumQuizNode
  isCurrent: boolean
  /** Topic-level indent when the quiz hangs off a lesson. */
  nested?: boolean
}

const { quiz, isCurrent, nested = false } = defineProps<Props>()
const { t } = useI18n()

const path = computed(() => `/learn/quizzes/${quiz.slug}`)

interface Visual {
  icon: string
  colorClass: string
}

const { isLocked, tooltipText } = useCurriculumLock(() => quiz.lock)

// The padlock outranks the status glyph: a locked quiz the learner has
// never sat would otherwise read as merely "not started".
const visual = computed<Visual>(() => {
  if (isLocked.value) {
    return { icon: 'i-lucide-lock', colorClass: 'text-muted' }
  }
  switch (quiz.status) {
    case 'passed':
      return { icon: 'i-lucide-circle-check-big', colorClass: 'text-success' }
    case 'failed':
      return { icon: 'i-lucide-circle-x', colorClass: 'text-error' }
    case 'in_progress':
      return { icon: 'i-lucide-pencil-line', colorClass: 'text-primary' }
    default:
      return { icon: 'i-lucide-clipboard-list', colorClass: 'text-muted' }
  }
})

const indentClass = computed(() => (nested ? 'ps-7' : 'ps-3'))

// A passed/failed quiz shows the learner's best score; otherwise a quiz
// glyph label distinguishes it from lessons at a glance.
const trailingLabel = computed(() => {
  if (quiz.best_score_pct !== null && (quiz.status === 'passed' || quiz.status === 'failed')) {
    return t('learn.rail.quiz_score', { pct: quiz.best_score_pct })
  }
  return quiz.is_final_exam ? t('learn.rail.final_exam') : t('learn.rail.quiz_label')
})
</script>

<template>
  <UTooltip
    v-if="isLocked"
    :text="tooltipText"
  >
    <div
      class="flex items-center gap-2 pe-3 py-2 text-sm rounded-md text-muted opacity-60 cursor-not-allowed"
      :class="indentClass"
      aria-disabled="true"
    >
      <UIcon
        :name="visual.icon"
        class="size-4 shrink-0"
        :class="visual.colorClass"
      />
      <span class="truncate flex-1">{{ quiz.title }}</span>
      <span class="text-xs text-muted shrink-0">{{ trailingLabel }}</span>
      <span class="sr-only">{{ tooltipText }}</span>
    </div>
  </UTooltip>
  <NuxtLink
    v-else
    :to="path"
    class="flex items-center gap-2 pe-3 py-2 text-sm rounded-md transition-colors"
    :class="[
      isCurrent
        ? 'bg-primary-50 dark:bg-primary-950 text-primary font-medium'
        : 'text-default hover:bg-elevated',
      indentClass
    ]"
    :aria-current="isCurrent ? 'page' : undefined"
  >
    <UIcon
      :name="visual.icon"
      class="size-4 shrink-0"
      :class="visual.colorClass"
    />
    <span class="truncate flex-1">{{ quiz.title }}</span>
    <span class="text-xs text-muted shrink-0">{{ trailingLabel }}</span>
  </NuxtLink>
</template>
