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

      <section v-if="lesson.video">
        <p class="text-muted text-sm mb-2">
          {{ t('learn.lesson.section.video') }} ({{ lesson.video.provider }})
        </p>
        <pre class="text-xs bg-elevated rounded-md p-3 overflow-x-auto"><code>{{ JSON.stringify(lesson.video, null, 2) }}</code></pre>
      </section>

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

      <p class="text-xs text-muted pt-8">
        <code>progress.status = {{ lesson.progress.status }}</code>
      </p>
    </article>
  </div>
</template>
