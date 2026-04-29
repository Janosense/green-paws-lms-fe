<script setup lang="ts">
import { formatDuration } from '~/utils/formatDuration'
import { isLearnNotFound, resolveLearnError } from '~/utils/resolveLearnError'

definePageMeta({
  layout: 'learn',
  middleware: 'auth'
})

const route = useRoute()
const { t } = useI18n()
const progressStore = useProgressStore()

const SLUG_PATTERN = /^[a-z0-9-]+$/

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

      <section v-if="topic.video">
        <p class="text-muted text-sm mb-2">
          {{ t('learn.topic.section.video') }} ({{ topic.video.provider }})
        </p>
        <pre class="text-xs bg-elevated rounded-md p-3 overflow-x-auto"><code>{{ JSON.stringify(topic.video, null, 2) }}</code></pre>
      </section>

      <section>
        <h2 class="text-lg mb-2">
          {{ t('learn.topic.section.content_preview') }}
        </h2>
        <pre class="text-xs bg-elevated rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words"><code>{{ JSON.stringify(topic.content.blocks, null, 2) }}</code></pre>
      </section>

      <p class="text-xs text-muted pt-8">
        <code>progress.status = {{ topic.progress.status }}</code>
      </p>
    </article>
  </div>
</template>
