<script setup lang="ts">
const route = useRoute()
const progressStore = useProgressStore()
const { t } = useI18n()

const currentLessonSlug = computed<string | null>(() => {
  const raw = route.params.lesson
  const value = Array.isArray(raw) ? raw[0] : raw
  return value ? String(value) : null
})

const currentTopicSlug = computed<string | null>(() => {
  const raw = route.params.topic
  const value = Array.isArray(raw) ? raw[0] : raw
  return value ? String(value) : null
})

// `/learn/sessions/[slug]` exposes the slug as `route.params.slug`. Match
// only on that route name so a future page also using `slug` won't bleed
// into session-leaf highlighting.
const currentSessionSlug = computed<string | null>(() => {
  if (route.name !== 'learn-sessions-slug') {
    return null
  }
  const raw = route.params.slug
  const value = Array.isArray(raw) ? raw[0] : raw
  return value ? String(value) : null
})

// `/learn/quizzes/[slug]` exposes the slug as `route.params.slug` under the
// `learn-quizzes-slug` route name; match only that so it can't collide with
// the session-leaf slug.
const currentQuizSlug = computed<string | null>(() => {
  if (route.name !== 'learn-quizzes-slug') {
    return null
  }
  const raw = route.params.slug
  const value = Array.isArray(raw) ? raw[0] : raw
  return value ? String(value) : null
})

const curriculum = computed(() => progressStore.currentCourse)
</script>

<template>
  <div class="flex flex-col h-full">
    <div
      v-if="curriculum"
      class="px-4 py-3 border-b border-default"
    >
      <NuxtLink
        :to="`/courses/${curriculum.course.slug}`"
        class="block group"
      >
        <p class="text-xs uppercase tracking-wider text-muted mb-1">
          {{ t('learn.rail.course_label') }}
        </p>
        <p class="font-medium text-default truncate group-hover:text-primary">
          {{ curriculum.course.title }}
        </p>
        <UProgress
          v-if="curriculum.course.enrollment"
          :model-value="curriculum.course.enrollment.progress_pct"
          :max="100"
          size="xs"
          color="primary"
          class="mt-2"
        />
        <p
          v-if="curriculum.course.enrollment"
          class="text-xs text-muted mt-1"
        >
          {{ t('learn.rail.progress_label', { pct: curriculum.course.enrollment.progress_pct }) }}
        </p>
      </NuxtLink>
    </div>

    <div class="flex-1 overflow-y-auto py-2 px-1">
      <div
        v-if="!curriculum"
        class="px-3 py-4 space-y-2"
      >
        <USkeleton class="h-6 w-full" />
        <USkeleton class="h-6 w-full" />
        <USkeleton class="h-6 w-full" />
      </div>
      <template v-else>
        <CurriculumRailModule
          v-for="module in curriculum.modules"
          :key="module.id"
          :module="module"
          :course-slug="curriculum.course.slug"
          :current-lesson-slug="currentLessonSlug"
          :current-topic-slug="currentTopicSlug"
          :current-quiz-slug="currentQuizSlug"
        />
        <div
          v-if="curriculum.orphan_lessons.length"
          class="pt-2 space-y-0.5"
        >
          <template
            v-for="lesson in curriculum.orphan_lessons"
            :key="lesson.id"
          >
            <CurriculumRailLeaf
              :leaf="{
                kind: 'lesson',
                lesson,
                lessonSlug: lesson.slug,
                courseSlug: curriculum.course.slug
              }"
              :is-current="currentLessonSlug === lesson.slug && !currentTopicSlug"
            />
            <CurriculumRailQuizLeaf
              v-for="quiz in lesson.quizzes"
              :key="`quiz-${quiz.id}`"
              :quiz="quiz"
              :is-current="currentQuizSlug === quiz.slug"
              nested
            />
          </template>
        </div>
        <div
          v-if="curriculum.sessions.length"
          class="pt-2 space-y-0.5"
        >
          <template
            v-for="session in curriculum.sessions"
            :key="session.id"
          >
            <CurriculumRailSessionLeaf
              :session="session"
              :is-current="currentSessionSlug === session.slug"
            />
            <CurriculumRailQuizLeaf
              v-for="quiz in session.quizzes"
              :key="`quiz-${quiz.id}`"
              :quiz="quiz"
              :is-current="currentQuizSlug === quiz.slug"
              nested
            />
          </template>
        </div>
        <div
          v-if="curriculum.course_quizzes.length"
          class="pt-2 space-y-0.5"
        >
          <CurriculumRailQuizLeaf
            v-for="quiz in curriculum.course_quizzes"
            :key="quiz.id"
            :quiz="quiz"
            :is-current="currentQuizSlug === quiz.slug"
          />
        </div>
      </template>
    </div>
  </div>
</template>
