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
const quizAttempt = useQuizAttempt(() => props.slug)

// ----- question navigation -----

const orderedQuestions = computed(() => {
  const order = props.state.attempt.question_order
  const byId = new Map(props.state.questions.map(q => [q.id, q]))
  return order
    .map(id => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
})

const totalCount = computed(() => orderedQuestions.value.length)

const answeredQuestionIds = computed(
  () => new Set(props.state.saved_answers.map(a => a.question_id))
)

const answeredIndices = computed(() => {
  const ids = answeredQuestionIds.value
  return orderedQuestions.value
    .map((q, idx) => (ids.has(q.id) ? idx : -1))
    .filter(idx => idx !== -1)
})

const answeredCount = computed(() => answeredQuestionIds.value.size)

function findFirstUnansweredIndex(): number {
  const ids = answeredQuestionIds.value
  const idx = orderedQuestions.value.findIndex(q => !ids.has(q.id))
  return idx === -1 ? 0 : idx
}

const currentIndex = ref<number>(findFirstUnansweredIndex())
const currentQuestion = computed(() => orderedQuestions.value[currentIndex.value] ?? null)
const currentInitialAnswer = computed(() => {
  const q = currentQuestion.value
  if (!q) return null
  return props.state.saved_answers.find(a => a.question_id === q.id) ?? null
})

const isFirst = computed(() => currentIndex.value <= 0)
const isLast = computed(() => currentIndex.value >= totalCount.value - 1)

const cardRef = ref<{ flush: () => Promise<void> } | null>(null)

async function flushCurrent(): Promise<void> {
  try {
    await cardRef.value?.flush()
  } catch {
    // store surfaces error via its `errors` map; player keeps going
  }
}

async function onPrev(): Promise<void> {
  await flushCurrent()
  currentIndex.value = Math.max(0, currentIndex.value - 1)
}

async function onNext(): Promise<void> {
  await flushCurrent()
  currentIndex.value = Math.min(totalCount.value - 1, currentIndex.value + 1)
}

async function onJump(index: number): Promise<void> {
  if (index === currentIndex.value) return
  await flushCurrent()
  currentIndex.value = index
}

// ----- submit gate -----

const isSubmitting = ref(false)
const confirmOpen = ref(false)

async function performSubmit(): Promise<void> {
  isSubmitting.value = true
  try {
    await flushCurrent()
    await quizAttempt.submit()
  } catch (error) {
    const resolution = resolveQuizError(error)
    toast.add({
      title: t(resolution.key),
      color: 'error',
      icon: 'i-lucide-octagon-alert'
    })
  } finally {
    isSubmitting.value = false
  }
}

function onSubmit(): void {
  if (answeredCount.value < totalCount.value) {
    confirmOpen.value = true
    return
  }
  void performSubmit()
}

function onConfirmFinish(): void {
  confirmOpen.value = false
  void performSubmit()
}

// ----- timer -----

const attemptRef = computed(() => props.state.attempt)

let expireFiredOnce = false

const timer = useQuizTimer({
  attempt: attemptRef,
  onExpire: () => {
    if (expireFiredOnce) return
    expireFiredOnce = true
    void performSubmit()
  }
})

function onVisibilityChange(): void {
  if (typeof document === 'undefined') return
  if (document.visibilityState === 'hidden') {
    timer.pause()
  } else {
    timer.resume()
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
})

const timerColor = computed<'error' | 'warning' | 'neutral'>(() => {
  if (timer.isUnlimited.value) return 'neutral'
  if (timer.remaining.value <= 60) return 'error'
  if (timer.remaining.value <= 300) return 'warning'
  return 'neutral'
})
</script>

<template>
  <div class="space-y-6">
    <header class="space-y-2">
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <h1 class="text-2xl md:text-3xl font-medium tracking-tight">
            {{ slug }}
          </h1>
          <p class="text-sm text-muted">
            {{ t('quiz.player.questionCount', { current: currentIndex + 1, total: totalCount }) }}
          </p>
        </div>

        <UBadge
          v-if="!timer.isUnlimited.value"
          :color="timerColor"
          variant="subtle"
          icon="i-lucide-clock"
          size="lg"
          :aria-label="t('quiz.player.timeRemaining')"
        >
          {{ timer.formatted.value }}
        </UBadge>
        <UBadge
          v-else
          color="neutral"
          variant="subtle"
          icon="i-lucide-infinity"
        >
          {{ t('quiz.player.timeUnlimited') }}
        </UBadge>
      </div>
    </header>

    <QuizQuestionDots
      :total="totalCount"
      :current-index="currentIndex"
      :answered-indices="answeredIndices"
      @jump="onJump"
    />

    <QuizQuestionCard
      v-if="currentQuestion"
      ref="cardRef"
      :question="currentQuestion"
      :initial-answer="currentInitialAnswer"
      :slug="slug"
      :question-number="currentIndex + 1"
      :is-readonly="false"
    />

    <QuizPlayerNavigation
      :is-first="isFirst"
      :is-last="isLast"
      :answered-count="answeredCount"
      :total-count="totalCount"
      :is-submitting="isSubmitting"
      @prev="onPrev"
      @next="onNext"
      @submit="onSubmit"
    />

    <UModal
      v-model:open="confirmOpen"
      :title="t('quiz.player.confirmFinishTitle')"
      :description="t('quiz.player.confirmFinishBody', { answered: answeredCount, total: totalCount })"
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            variant="ghost"
            color="neutral"
            @click="confirmOpen = false"
          >
            {{ t('quiz.player.confirmFinishCancel') }}
          </UButton>
          <UButton
            color="primary"
            :loading="isSubmitting"
            @click="onConfirmFinish"
          >
            {{ t('quiz.player.confirmFinishConfirm') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
