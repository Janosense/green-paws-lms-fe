<script setup lang="ts">
import type { VideoPlayerAdapter } from '~/lib/video/types'
import {
  flattenCurriculum,
  neighborsByTopicSlug
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

// Unicode-letter-aware: WP preserves the original locale in `post_name`
// (Cyrillic course titles produce Cyrillic slugs), so an ASCII-only regex
// would reject legitimate URLs. The backend remains the source of truth —
// anything it can't resolve comes back as a clean 404.
const SLUG_PATTERN = /^[\p{L}\p{N}_-]+$/u

const lessonSlug = computed<string>(() => {
  const raw = route.params.lesson
  return (Array.isArray(raw) ? raw[0] : raw) ?? ''
})
const topicSlug = computed<string>(() => {
  const raw = route.params.topic
  return (Array.isArray(raw) ? raw[0] : raw) ?? ''
})

if (!SLUG_PATTERN.test(lessonSlug.value) || !SLUG_PATTERN.test(topicSlug.value)) {
  throw createError({
    statusCode: 400,
    statusMessage: 'Invalid topic slug',
    fatal: true
  })
}

const { data, status, error, refresh } = await useLearnTopic(lessonSlug, topicSlug)

const topic = computed(() => {
  const envelope = data.value
  return envelope && envelope.success ? envelope.data : null
})

watch(
  topic,
  (current) => {
    if (current) {
      void progressStore.ensureCourseLoaded(current.course.slug)
    }
  },
  { immediate: true }
)

const errorKey = computed(() => resolveLearnError(error.value, 'topic'))
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
  if (!topic.value) {
    return t('learn.topic.loading.title')
  }
  return `${topic.value.title} — ${topic.value.course.title}`
})

useSeoMeta({
  title: () => seoTitle.value,
  robots: 'noindex, nofollow'
})

// --- Phase 5.5: player + progress tracker wiring ---

const videoAdapterRef = shallowRef<VideoPlayerAdapter | null>(null)
const resumePromptShown = ref(false)

const initialTopic = topic.value
const tracker = initialTopic
  ? useProgressTracker({
      entityType: 'topic',
      entityId: initialTopic.id,
      durationSeconds: initialTopic.duration_seconds,
      initialProgress: initialTopic.progress,
      videoAdapter: videoAdapterRef,
      courseSlug: initialTopic.course.slug
    })
  : null

const isCompleted = computed(() => {
  if (tracker) return tracker.completed.value
  return topic.value?.progress.status === 'completed'
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
  const current = topic.value
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

watch(topic, () => {
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
  neighborsByTopicSlug(navigationLeaves.value, lessonSlug.value, topicSlug.value)
)
</script>

<template>
  <div>
    <LoadingSkeleton
      v-if="status === 'pending' && !topic"
      variant="text"
      :count="6"
    />

    <NotFound
      v-else-if="showNotFound"
      :title="t('learn.topic.not_found.title')"
      :description="t('learn.topic.not_found.description')"
    />

    <ErrorState
      v-else-if="error && !topic"
      icon="i-lucide-circle-alert"
      :title="t('learn.topic.error.title')"
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
          {{ t('learn.topic.error.back_to_dashboard') }}
        </UButton>
      </div>
    </ErrorState>

    <article
      v-else-if="topic"
      class="space-y-6"
    >
      <PreviewBanner />
      <header class="space-y-3">
        <h1 class="text-2xl md:text-3xl font-medium tracking-tight">
          {{ topic.title }}
        </h1>
        <p class="text-muted text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
          <NuxtLink
            :to="`/courses/${topic.course.slug}`"
            class="text-primary hover:underline"
          >
            {{ topic.course.title }}
          </NuxtLink>
          <template v-if="topic.module">
            <span aria-hidden="true">·</span>
            <NuxtLink
              :to="`/courses/${topic.course.slug}#module-${topic.module.id}`"
              class="text-primary hover:underline"
            >
              {{ topic.module.title }}
            </NuxtLink>
          </template>
          <span aria-hidden="true">·</span>
          <NuxtLink
            :to="`/learn/${topic.lesson.slug}`"
            class="text-primary hover:underline"
          >
            {{ topic.lesson.title }}
          </NuxtLink>
          <template v-if="formatSeconds(topic.duration_seconds)">
            <span aria-hidden="true">·</span>
            <span>{{ formatSeconds(topic.duration_seconds) }}</span>
          </template>
        </p>
      </header>

      <ClientOnly v-if="topic.video">
        <VideoPlayer
          :video="topic.video"
          @ready="onPlayerReady"
          @error="onPlayerError"
        />
        <template #fallback>
          <div class="mb-6">
            <USkeleton class="aspect-video w-full rounded-lg" />
          </div>
        </template>
      </ClientOnly>

      <MarkCompleteButton
        :completed="isCompleted"
        @click="handleMarkComplete"
      />

      <BlockRenderer
        :blocks="topic.content.blocks"
        class="mt-8"
      />

      <LearnPagination
        v-if="curriculum && (neighbors.prev || neighbors.next)"
        :prev="neighbors.prev"
        :next="neighbors.next"
        :next-highlighted="isCompleted ?? false"
      />
    </article>
  </div>
</template>
