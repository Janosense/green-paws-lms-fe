<script setup lang="ts">
import { resolveQuizError } from '~/utils/resolveQuizError'

definePageMeta({
  layout: 'learn',
  middleware: 'auth',
  validate: (route) => {
    const raw = route.params.slug
    const slug = Array.isArray(raw) ? raw[0] : raw
    return typeof slug === 'string' && /^[a-z0-9-]+$/.test(slug)
  }
})

const route = useRoute()
const { t } = useI18n()

const slug = computed<string>(() => {
  const raw = route.params.slug
  return (Array.isArray(raw) ? raw[0] : raw) ?? ''
})

const quizAttempt = useQuizAttempt(slug)

// SSR-friendly: useAsyncData wraps the imperative store call so the page
// participates in the SSR payload. The same in-flight guard inside the
// store collapses concurrent calls; this just ensures the first paint
// has data.
const { error: bootError, refresh } = await useAsyncData(
  () => `quiz-attempt-${slug.value}`,
  async () => {
    await quizAttempt.start()
    return true
  },
  { watch: [slug] }
)

const errorState = computed(() => quizAttempt.error.value ?? bootError.value ?? null)
const errorResolution = computed(() => resolveQuizError(errorState.value))

const attempt = computed(() => quizAttempt.state.value)

const isFinalized = computed(() => {
  const status = attempt.value?.attempt.status
  return status === 'submitted' || status === 'expired'
})

useSeoMeta({
  title: () => t('quiz.player.seoTitle', { slug: slug.value }),
  robots: 'noindex, follow'
})

function onRetry(): void {
  void refresh()
}
</script>

<template>
  <div>
    <LoadingSkeleton
      v-if="!attempt && !errorState"
      variant="text"
      :count="6"
    />

    <QuizError
      v-else-if="errorState && (!attempt || errorResolution.fatal)"
      :error-key="errorResolution.key"
      :fatal="errorResolution.fatal"
    >
      <template #cta>
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-rotate-ccw"
          @click="onRetry"
        >
          {{ t('common.try_again') }}
        </UButton>
      </template>
    </QuizError>

    <QuizResults
      v-else-if="attempt && isFinalized"
      :state="attempt"
      :slug="slug"
    />

    <QuizPlayer
      v-else-if="attempt"
      :state="attempt"
      :slug="slug"
    />
  </div>
</template>
