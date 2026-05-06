<script setup lang="ts">
import type { QuizAttemptStateResponse } from '#shared/types/quiz'
import { resolveQuizError } from '~/utils/resolveQuizError'

interface Props {
  state: QuizAttemptStateResponse
  slug: string
}

const props = defineProps<Props>()

const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const quizAttempt = useQuizAttempt(() => props.slug)
const progressStore = useProgressStore()

const isExpired = computed(() => props.state.attempt.status === 'expired')
const passed = computed(() => props.state.attempt.passed === true)

const headlineKey = computed(() => {
  if (isExpired.value) return 'quiz.results.expired'
  return passed.value ? 'quiz.results.passed' : 'quiz.results.failed'
})

const headlineIcon = computed(() => {
  if (isExpired.value) return 'i-lucide-clock'
  return passed.value ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'
})

const headlineColor = computed<'success' | 'error' | 'warning'>(() => {
  if (isExpired.value) return 'warning'
  return passed.value ? 'success' : 'error'
})

const orderedQuestions = computed(() => {
  const order = props.state.attempt.question_order
  const byId = new Map(props.state.questions.map(q => [q.id, q]))
  return order
    .map(id => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
})

const answersByQuestion = computed(() => {
  const map = new Map<number, typeof props.state.saved_answers[number]>()
  for (const a of props.state.saved_answers) map.set(a.question_id, a)
  return map
})

function answerFor(questionId: number) {
  return answersByQuestion.value.get(questionId) ?? null
}

function formatTimeTaken(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

const isRetrying = ref(false)

async function onTryAgain(): Promise<void> {
  if (isRetrying.value) return
  isRetrying.value = true
  try {
    await quizAttempt.start()
  } catch (error) {
    const resolution = resolveQuizError(error)
    toast.add({
      title: t(resolution.key),
      color: 'error',
      icon: 'i-lucide-octagon-alert'
    })
  } finally {
    isRetrying.value = false
  }
}

async function onBackToCourse(): Promise<void> {
  // We have course_id but the dashboard / curriculum index uses slug.
  // Without quiz_title or course_slug in the response (carry-over), the
  // safest route is /dashboard, which surfaces enrolled courses.
  await router.push('/dashboard')
  // The progress store will rehydrate when the user opens the course.
  unref(progressStore)
}

// Reveal markers are determined by the presence of `is_correct` on the
// saved answers (set by the backend per the policy + status + passed
// matrix). When markers are absent we render the "correct hidden" copy.
function hasReveal(questionId: number): boolean {
  const a = answerFor(questionId)
  if (!a) return false
  return a.is_correct === true || a.is_correct === false
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <div class="flex flex-col items-center text-center gap-3 py-4">
        <UIcon
          :name="headlineIcon"
          :class="[
            'size-12',
            headlineColor === 'success' ? 'text-success' : '',
            headlineColor === 'error' ? 'text-error' : '',
            headlineColor === 'warning' ? 'text-warning' : ''
          ]"
        />
        <h1 class="text-2xl md:text-3xl font-medium">
          {{ t(headlineKey) }}
        </h1>
        <p class="text-3xl font-semibold">
          {{ t('quiz.results.scoreFormat', { score: state.attempt.score ?? 0, max: state.attempt.max_score }) }}
        </p>
        <p class="text-sm text-muted">
          {{ t('quiz.results.passingThreshold', { threshold: state.attempt.passing_threshold }) }}
        </p>
        <p
          v-if="state.attempt.best_score !== null"
          class="text-sm text-muted"
        >
          {{ t('quiz.results.bestScore', { score: state.attempt.best_score }) }}
        </p>
        <p
          v-if="state.attempt.time_taken_seconds != null"
          class="text-sm text-muted"
        >
          {{ t('quiz.results.timeTaken', { time: formatTimeTaken(state.attempt.time_taken_seconds) }) }}
        </p>
      </div>
    </UCard>

    <section class="space-y-4">
      <h2 class="text-lg font-medium">
        {{ t('quiz.results.review') }}
      </h2>

      <div
        v-for="(question, index) in orderedQuestions"
        :key="question.id"
        class="space-y-3 rounded-md border border-default bg-default p-4"
      >
        <header class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="text-xs uppercase tracking-wide text-muted">
              {{ t('quiz.player.questionNumber', { n: index + 1 }) }}
            </p>
            <h3 class="text-base font-medium">
              {{ question.title }}
            </h3>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <UIcon
              v-if="answerFor(question.id)?.is_correct === true"
              name="i-lucide-check-circle-2"
              class="size-5 text-success"
            />
            <UIcon
              v-else-if="answerFor(question.id)?.is_correct === false"
              name="i-lucide-x-circle"
              class="size-5 text-error"
            />
            <UIcon
              v-else-if="!answerFor(question.id)"
              name="i-lucide-circle-dashed"
              class="size-5 text-muted"
            />
            <span
              v-if="answerFor(question.id)?.points_awarded != null"
              class="text-sm text-muted"
            >
              {{ answerFor(question.id)!.points_awarded }} / {{ question.points }}
            </span>
          </div>
        </header>

        <QuizInputSingleChoice
          v-if="question.type === 'single_choice'"
          :question="question"
          :initial-data="(answerFor(question.id)?.answer_data as { answer_id: string } | undefined) ?? null"
          :is-readonly="true"
        />
        <QuizInputMultipleChoice
          v-else-if="question.type === 'multiple_choice'"
          :question="question"
          :initial-data="(answerFor(question.id)?.answer_data as { answer_ids: string[] } | undefined) ?? null"
          :is-readonly="true"
        />
        <QuizInputTrueFalse
          v-else-if="question.type === 'true_false'"
          :question="question"
          :initial-data="(answerFor(question.id)?.answer_data as { value: boolean } | undefined) ?? null"
          :is-readonly="true"
        />
        <QuizInputText
          v-else
          :question="question"
          :initial-data="(answerFor(question.id)?.answer_data as { text: string } | undefined) ?? null"
          :is-readonly="true"
        />

        <p
          v-if="!hasReveal(question.id) && answerFor(question.id)"
          class="text-xs text-muted"
        >
          {{ t('quiz.results.correctHidden') }}
        </p>

        <div
          v-if="question.explanation"
          class="rounded-md bg-elevated p-3"
        >
          <p class="text-xs uppercase tracking-wide text-muted mb-1">
            {{ t('quiz.results.explanation') }}
          </p>
          <!-- eslint-disable-next-line vue/no-v-html -- Backend sanitises with wp_kses_post before sending. -->
          <div
            class="prose prose-sm max-w-none"
            v-html="question.explanation"
          />
        </div>
      </div>
    </section>

    <footer class="flex flex-wrap justify-end gap-3 pt-4 border-t border-default">
      <UButton
        variant="ghost"
        color="neutral"
        @click="onBackToCourse"
      >
        {{ t('quiz.results.backToCourse') }}
      </UButton>
      <UButton
        color="primary"
        icon="i-lucide-rotate-ccw"
        :loading="isRetrying"
        :disabled="state.attempt.attempts_remaining === 0"
        :title="state.attempt.attempts_remaining === 0 ? t('quiz.results.attemptsExhausted') : undefined"
        @click="onTryAgain"
      >
        {{ t('quiz.results.tryAgain') }}
      </UButton>
    </footer>
  </div>
</template>
