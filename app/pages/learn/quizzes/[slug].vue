<script setup lang="ts">
import {
  flattenCurriculum,
  neighborsByQuizSlug
} from '~/composables/useLearnNavigation'
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
const progressStore = useProgressStore()

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

// Hydrate the surrounding course so the curriculum rail + prev/next
// pagination resolve, even on a deep-linked quiz page. The attempt carries
// its resolved course slug (Phase 9.11 backend addition).
watch(
  () => attempt.value?.attempt.course_slug ?? null,
  (courseSlug) => {
    if (courseSlug) {
      void progressStore.ensureCourseLoaded(courseSlug)
    }
  },
  { immediate: true }
)

// Passing a quiz can unlock the rest of the course, but the rail renders
// from the cached curriculum snapshot and does not self-update — so without
// this the learner sees their newly-opened lessons still greyed out until a
// manual reload. Watched at page level rather than inside the quizAttempt
// store to avoid store-to-store coupling; `useProgressTracker` calls
// `refreshCourse` the same way. Also fires on a fresh load of an
// already-passed attempt, which is a harmless refetch that keeps the rail
// honest.
watch(
  () => [attempt.value?.attempt.passed === true, attempt.value?.attempt.course_slug ?? null] as const,
  ([passed, courseSlug]) => {
    if (passed && courseSlug) {
      void progressStore.refreshCourse(courseSlug)
    }
  },
  { immediate: true }
)

const curriculum = computed(() => progressStore.currentCourse)
const navigationLeaves = computed(() => {
  const c = curriculum.value
  return c ? flattenCurriculum(c) : []
})
const neighbors = computed(() => neighborsByQuizSlug(navigationLeaves.value, slug.value))

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

    <template v-else-if="attempt && isFinalized">
      <QuizResults
        :state="attempt"
        :slug="slug"
      />

      <LearnPagination
        v-if="curriculum && (neighbors.prev || neighbors.next)"
        :prev="neighbors.prev"
        :next="neighbors.next"
        :next-highlighted="attempt.attempt.passed === true"
        class="mt-12"
      />
    </template>

    <QuizPlayer
      v-else-if="attempt"
      :state="attempt"
      :slug="slug"
    />
  </div>
</template>
