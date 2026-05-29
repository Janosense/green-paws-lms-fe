<script setup lang="ts">
import type {
  CurriculumLessonNode,
  CurriculumModuleNode
} from '#shared/types/learn'
import type { LearnLeaf } from '~/composables/useLearnNavigation'

type LessonOrTopicLeaf = Extract<LearnLeaf, { kind: 'lesson' | 'topic' }>

interface Props {
  module: CurriculumModuleNode
  courseSlug: string
  currentLessonSlug: string | null
  currentTopicSlug: string | null
  currentQuizSlug: string | null
}

const { module, courseSlug, currentLessonSlug, currentTopicSlug, currentQuizSlug } = defineProps<Props>()

const containsCurrent = computed(() =>
  module.lessons.some(lesson => lesson.slug === currentLessonSlug)
)

const expanded = ref(containsCurrent.value)

watch(containsCurrent, (next) => {
  if (next) {
    expanded.value = true
  }
})

function isLessonCurrent(lesson: CurriculumLessonNode): boolean {
  // Lessons-with-topics now appear as their own pagination station
  // (`/learn/{lessonSlug}`), so highlight the lesson row whenever the
  // route is on the lesson page itself — the topic-slug guard already
  // distinguishes from being on one of its children.
  return lesson.slug === currentLessonSlug && !currentTopicSlug
}

function isTopicCurrent(lesson: CurriculumLessonNode, topicSlug: string): boolean {
  return lesson.slug === currentLessonSlug && topicSlug === currentTopicSlug
}

function lessonLeaf(lesson: CurriculumLessonNode): LessonOrTopicLeaf {
  return {
    kind: 'lesson',
    lesson,
    lessonSlug: lesson.slug,
    courseSlug
  }
}
</script>

<template>
  <section class="py-1">
    <button
      type="button"
      class="w-full flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider text-muted hover:text-default rounded-md"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <UIcon
        :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
        class="size-3 shrink-0"
      />
      <span class="truncate flex-1 text-start">{{ module.title }}</span>
    </button>

    <div
      v-if="expanded"
      class="space-y-0.5 mt-1"
    >
      <template
        v-for="lesson in module.lessons"
        :key="lesson.id"
      >
        <CurriculumRailLeaf
          :leaf="lessonLeaf(lesson)"
          :is-current="isLessonCurrent(lesson)"
        />
        <template v-if="lesson.has_topics && lesson.topics.length">
          <CurriculumRailLeaf
            v-for="topic in lesson.topics"
            :key="topic.id"
            :leaf="{
              kind: 'topic',
              lesson,
              topic,
              lessonSlug: lesson.slug,
              topicSlug: topic.slug,
              courseSlug
            }"
            :is-current="isTopicCurrent(lesson, topic.slug)"
          />
        </template>
        <CurriculumRailQuizLeaf
          v-for="quiz in lesson.quizzes"
          :key="`quiz-${quiz.id}`"
          :quiz="quiz"
          :is-current="currentQuizSlug === quiz.slug"
          nested
        />
      </template>
      <CurriculumRailQuizLeaf
        v-for="quiz in module.quizzes"
        :key="`module-quiz-${quiz.id}`"
        :quiz="quiz"
        :is-current="currentQuizSlug === quiz.slug"
      />
    </div>
  </section>
</template>
