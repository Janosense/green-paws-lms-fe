<script setup lang="ts">
import type { QuizAttemptHistoryEntry } from '#shared/types/quiz'
import { formatInSourceOffset } from '~/utils/formatInSourceOffset'

interface Props {
  slug: string
  /** Highlighted as "this one" — the attempt the results screen is showing. */
  currentAttemptId?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  currentAttemptId: null
})

const { t } = useI18n()
const quizAttempt = useQuizAttempt(() => props.slug)

const history = computed(() => quizAttempt.history.value)
const isLoading = computed(() => quizAttempt.isHistoryLoading.value)

// Newest first: the interesting row is almost always the most recent one,
// and the panel sits below a results screen the learner just landed on.
// `attempt_number` still reads forward, so "Спроба 1" stays the first
// sitting no matter where it renders.
const rows = computed<QuizAttemptHistoryEntry[]>(() =>
  [...(history.value?.attempts ?? [])].reverse()
)

// One sitting is not a history — the results screen above already says
// everything there is to say about it.
const hasHistory = computed(() => rows.value.length > 1)

const isOpen = ref(false)

onMounted(async () => {
  try {
    await quizAttempt.fetchHistory()
  } catch {
    // Supplementary panel: a failed fetch collapses it rather than
    // disturbing the results already on screen.
  }
})

function formatDateTime(value: string): string {
  return formatInSourceOffset(value, 'uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) ?? value
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

function statusIcon(row: QuizAttemptHistoryEntry): string {
  if (row.status === 'in_progress') return 'i-lucide-circle-dashed'
  if (row.status === 'expired') return 'i-lucide-clock'
  return row.passed ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'
}

function statusClass(row: QuizAttemptHistoryEntry): string {
  if (row.status === 'in_progress') return 'text-muted'
  if (row.status === 'expired') return 'text-warning'
  return row.passed ? 'text-success' : 'text-error'
}

function statusLabel(row: QuizAttemptHistoryEntry): string {
  if (row.status === 'in_progress') return t('quiz.history.statusInProgress')
  if (row.status === 'expired') return t('quiz.history.statusExpired')
  return row.passed ? t('quiz.history.statusPassed') : t('quiz.history.statusFailed')
}
</script>

<template>
  <section
    v-if="isLoading || hasHistory"
    class="space-y-4"
  >
    <h2 class="text-lg font-medium">
      {{ t('quiz.history.title') }}
    </h2>

    <div
      v-if="isLoading"
      class="space-y-2"
    >
      <USkeleton class="h-12 w-full" />
      <USkeleton class="h-12 w-full" />
    </div>

    <template v-else-if="history">
      <p class="text-sm text-muted">
        <template v-if="history.passed_on_attempt !== null">
          {{ t('quiz.history.summaryPassed', {
            total: history.total_attempts,
            attempt: history.passed_on_attempt
          }) }}
        </template>
        <template v-else>
          {{ t('quiz.history.summaryNotPassed', { total: history.total_attempts }) }}
        </template>
      </p>

      <UButton
        variant="ghost"
        color="neutral"
        size="sm"
        :icon="isOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        :aria-expanded="isOpen"
        @click="isOpen = !isOpen"
      >
        {{ isOpen ? t('quiz.history.collapse') : t('quiz.history.expand') }}
      </UButton>

      <ol
        v-if="isOpen"
        class="space-y-2"
      >
        <li
          v-for="row in rows"
          :key="row.id"
          class="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border p-3"
          :class="row.id === props.currentAttemptId
            ? 'border-primary bg-elevated'
            : 'border-default bg-default'"
        >
          <UIcon
            :name="statusIcon(row)"
            class="size-5 shrink-0"
            :class="statusClass(row)"
          />

          <span class="text-sm font-medium">
            {{ t('quiz.history.attemptNumber', { n: row.attempt_number }) }}
          </span>

          <span
            class="text-sm"
            :class="statusClass(row)"
          >
            {{ statusLabel(row) }}
          </span>

          <span
            v-if="row.score_percent !== null"
            class="text-sm text-muted"
          >
            {{ t('quiz.history.scoreFormat', {
              score: row.score ?? 0,
              max: row.max_score,
              percent: row.score_percent
            }) }}
          </span>

          <span class="text-xs text-muted ms-auto">
            {{ formatDateTime(row.submitted_at ?? row.started_at) }}
          </span>

          <span
            v-if="row.time_taken_seconds != null"
            class="text-xs text-muted"
          >
            {{ formatDuration(row.time_taken_seconds) }}
          </span>
        </li>
      </ol>
    </template>
  </section>
</template>
