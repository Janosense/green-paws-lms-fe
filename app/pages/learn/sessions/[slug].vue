<script setup lang="ts">
import type { SessionDetailResponse } from '#shared/types/learn'
import {
  flattenCurriculum,
  neighborsBySessionSlug
} from '~/composables/useLearnNavigation'
import { resolveSessionError } from '~/utils/resolveSessionError'

definePageMeta({
  layout: 'learn',
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const progressStore = useProgressStore()

const SLUG_PATTERN = /^[a-z0-9-]+$/

const slug = computed<string>(() => {
  const raw = route.params.slug
  return (Array.isArray(raw) ? raw[0] : raw) ?? ''
})

if (!SLUG_PATTERN.test(slug.value)) {
  throw createError({
    statusCode: 400,
    statusMessage: 'Invalid session slug',
    fatal: true
  })
}

const { data, status, error, refresh } = await useApiFetch<SessionDetailResponse>(
  () => `/vl/v1/learn/sessions/${slug.value}`
)

const detail = computed(() => {
  const value = data.value
  if (!value || value.success !== true) return null
  return value
})

const apiCode = computed(() => {
  const raw = error.value as { code?: unknown } | null
  return raw && typeof raw.code === 'string' ? raw.code : null
})

if (apiCode.value === 'session_not_found') {
  throw createError({
    statusCode: 404,
    statusMessage: 'Session not found',
    fatal: true
  })
}

// Bounce non-enrolled users back to the catalog with a deep link.
watchEffect(() => {
  if (!error.value) return
  const resolved = resolveSessionError(error.value)
  if (apiCode.value === 'not_enrolled' && import.meta.client) {
    toast.add({
      title: t(resolved.key),
      color: 'warning',
      icon: 'i-lucide-info'
    })
    void router.replace('/dashboard')
  }
})

watch(
  detail,
  (current) => {
    if (current) {
      void progressStore.ensureCourseLoaded(current.session.course_slug)
    }
  },
  { immediate: true }
)

useSeoMeta({
  title: () => detail.value?.session.title ?? t('learn.session.session_label', { title: '' }),
  robots: 'noindex, nofollow'
})

const errorResolution = computed(() => resolveSessionError(error.value))

const curriculum = computed(() => progressStore.currentCourse)
const navigationLeaves = computed(() => {
  const c = curriculum.value
  return c ? flattenCurriculum(c) : []
})
const neighbors = computed(() =>
  neighborsBySessionSlug(navigationLeaves.value, slug.value)
)
</script>

<template>
  <div>
    <LoadingSkeleton
      v-if="status === 'pending' && !detail"
      variant="text"
      :count="6"
    />

    <ErrorState
      v-else-if="error && !detail && apiCode !== 'not_enrolled'"
      icon="i-lucide-circle-alert"
      :title="t('common.error_title')"
      :description="t(errorResolution.key)"
    >
      <div class="flex flex-wrap gap-3 justify-center">
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-rotate-ccw"
          @click="refresh()"
        >
          {{ t('common.try_again') }}
        </UButton>
        <UButton
          color="primary"
          to="/dashboard"
        >
          {{ t('learn.lesson.error.back_to_dashboard') }}
        </UButton>
      </div>
    </ErrorState>

    <template v-else-if="detail">
      <SessionPlayer :detail="detail" />

      <LearnPagination
        v-if="curriculum && (neighbors.prev || neighbors.next)"
        :prev="neighbors.prev"
        :next="neighbors.next"
        :next-highlighted="false"
        class="mt-12"
      />
    </template>
  </div>
</template>
