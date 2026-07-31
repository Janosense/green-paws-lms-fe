<script setup lang="ts">
import type { VideoPlayerAdapter } from '~/lib/video/types'
import {
  flattenCurriculum,
  neighborsByLessonSlug
} from '~/composables/useLearnNavigation'
import { formatDuration } from '~/utils/formatDuration'
import { isLearnNotFound, resolveLearnError } from '~/utils/resolveLearnError'

definePageMeta({
  layout: 'learn',
  middleware: 'learn'
})

const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const progressStore = useProgressStore()

// Unicode-letter-aware: see `[topic].vue` for the rationale.
const SLUG_PATTERN = /^[\p{L}\p{N}_-]+$/u

const lessonSlug = computed<string>(() => {
  const raw = route.params.lesson
  return (Array.isArray(raw) ? raw[0] : raw) ?? ''
})

if (!SLUG_PATTERN.test(lessonSlug.value)) {
  throw createError({
    statusCode: 400,
    statusMessage: 'Invalid lesson slug',
    fatal: true
  })
}

const { data, status, error, refresh } = await useLearnLesson(lessonSlug)

const lesson = computed(() => {
  const envelope = data.value
  return envelope && envelope.success ? envelope.data : null
})

watch(
  lesson,
  (current) => {
    if (current) {
      void progressStore.ensureCourseLoaded(current.course.slug)
    }
  },
  { immediate: true }
)

const errorKey = computed(() => resolveLearnError(error.value, 'lesson'))
const showNotFound = computed(() => Boolean(error.value) && isLearnNotFound(error.value))

const durationUnits = computed(() => ({
  hours: t('landing.duration.hours_short'),
  minutes: t('landing.duration.minutes_short')
}))

function formatSeconds(seconds: number): string {
  return formatDuration(seconds / 3600, durationUnits.value)
}

function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

const seoTitle = computed(() => {
  if (!lesson.value) {
    return t('learn.lesson.loading.title')
  }
  return `${lesson.value.title} — ${lesson.value.course.title}`
})

useSeoMeta({
  title: () => seoTitle.value,
  robots: 'noindex, nofollow'
})

// --- Phase 5.5: player + progress tracker wiring ---

const videoAdapterRef = shallowRef<VideoPlayerAdapter | null>(null)
const resumePromptShown = ref(false)

// Lifecycle hooks must register during setup; instantiate the tracker once
// using the resolved SSR data. Subsequent client-side refreshes that swap
// the lesson are out of scope for 5.5 — route changes remount the page.
const initialLesson = lesson.value
const tracker = initialLesson
  ? useProgressTracker({
      entityType: 'lesson',
      entityId: initialLesson.id,
      durationSeconds: initialLesson.duration_seconds,
      initialProgress: initialLesson.progress,
      videoAdapter: videoAdapterRef,
      courseSlug: initialLesson.course.slug
    })
  : null

const isCompleted = computed(() => {
  if (tracker) return tracker.completed.value
  return lesson.value?.progress.status === 'completed'
})

function handleMarkComplete(): void {
  tracker?.markComplete()
}

function onPlayerReady(adapter: VideoPlayerAdapter): void {
  videoAdapterRef.value = adapter
}

function onPlayerError(err: Error): void {
  if (import.meta.dev) {
    console.warn('[learn] video player error', err)
  }
}

function maybeShowResumeToast(): void {
  if (resumePromptShown.value) return
  if (!import.meta.client) return
  const current = lesson.value
  if (!current || !current.video) return
  const progress = current.progress
  if (!progress) return
  if (progress.status === 'completed') return
  const startAt = progress.position_seconds ?? 0
  if (startAt <= 0) return

  resumePromptShown.value = true
  toast.add({
    title: t('learn.player.resume.title'),
    description: t('learn.player.resume.description', { time: formatTimestamp(startAt) }),
    icon: 'i-lucide-history',
    duration: 8_000,
    actions: [
      {
        label: t('learn.player.resume.action'),
        color: 'primary',
        onClick: () => {
          void videoAdapterRef.value?.seekTo(startAt)
        }
      }
    ]
  })
}

watch(lesson, () => {
  if (import.meta.client) {
    maybeShowResumeToast()
  }
}, { immediate: true })

const curriculum = computed(() => progressStore.currentCourse)

const navigationLeaves = computed(() => {
  const c = curriculum.value
  return c ? flattenCurriculum(c) : []
})

const neighbors = computed(() =>
  neighborsByLessonSlug(navigationLeaves.value, lessonSlug.value)
)

const completionHint = computed(() => {
  const mode = curriculum.value?.course.completion_mode
  if (!mode) return undefined
  return t(mode === 'sequential' ? 'learn.complete.hint_sequential' : 'learn.complete.hint_free')
})
</script>

<template>
  <div>
    <LoadingSkeleton
      v-if="status === 'pending' && !lesson"
      variant="text"
      :count="6"
    />

    <NotFound
      v-else-if="showNotFound"
      :title="t('learn.lesson.not_found.title')"
      :description="t('learn.lesson.not_found.description')"
    />

    <ErrorState
      v-else-if="error && !lesson"
      icon="i-lucide-circle-alert"
      :title="t('learn.lesson.error.title')"
      :description="t(errorKey)"
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

    <article
      v-else-if="lesson"
      class="space-y-6"
    >
      <PreviewBanner />
      <header class="space-y-3">
        <h1 class="text-2xl md:text-3xl font-medium tracking-tight">
          {{ lesson.title }}
        </h1>
        <p class="text-muted text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
          <NuxtLink
            :to="`/courses/${lesson.course.slug}`"
            class="text-primary hover:underline"
          >
            {{ lesson.course.title }}
          </NuxtLink>
          <template v-if="lesson.module">
            <span aria-hidden="true">·</span>
            <NuxtLink
              :to="`/courses/${lesson.course.slug}#module-${lesson.module.id}`"
              class="text-primary hover:underline"
            >
              {{ lesson.module.title }}
            </NuxtLink>
          </template>
          <template v-if="formatSeconds(lesson.duration_seconds)">
            <span aria-hidden="true">·</span>
            <span>{{ formatSeconds(lesson.duration_seconds) }}</span>
          </template>
          <template v-if="lesson.is_preview">
            <span aria-hidden="true">·</span>
            <UBadge
              color="info"
              variant="soft"
            >
              {{ t('learn.lesson.badge.preview') }}
            </UBadge>
          </template>
        </p>
      </header>

      <ClientOnly v-if="lesson.video">
        <VideoPlayer
          :video="lesson.video"
          @ready="onPlayerReady"
          @error="onPlayerError"
        />
        <template #fallback>
          <div class="mb-6">
            <USkeleton class="aspect-video w-full rounded-lg" />
          </div>
        </template>
      </ClientOnly>

      <section v-if="lesson.attachments.length">
        <h2 class="text-lg mb-2">
          {{ t('learn.lesson.section.attachments') }}
        </h2>
        <pre class="text-xs bg-elevated rounded-md p-3 overflow-x-auto"><code>{{ JSON.stringify(lesson.attachments, null, 2) }}</code></pre>
      </section>

      <BlockRenderer
        :blocks="lesson.content.blocks"
        class="mt-8"
      />

      <MarkCompleteButton
        :completed="isCompleted"
        :hint="completionHint"
        @click="handleMarkComplete"
      />

      <LearnPagination
        v-if="curriculum && (neighbors.prev || neighbors.next)"
        :prev="neighbors.prev"
        :next="neighbors.next"
        :next-highlighted="isCompleted ?? false"
      />

      <section v-if="lesson.topics.length">
        <h2 class="text-lg mb-2">
          {{ t('learn.lesson.section.topics') }}
        </h2>
        <ul class="space-y-2">
          <li
            v-for="topic in lesson.topics"
            :key="topic.id"
          >
            <NuxtLink
              :to="`/learn/${lesson.slug}/${topic.slug}`"
              class="text-primary hover:underline"
            >
              {{ topic.menu_order }}. {{ topic.title }}
            </NuxtLink>
            <span
              v-if="formatSeconds(topic.duration_seconds)"
              class="text-muted text-sm ml-2"
            >
              ({{ formatSeconds(topic.duration_seconds) }})
            </span>
          </li>
        </ul>
      </section>
    </article>
  </div>
</template>
