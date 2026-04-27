<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'
import type { Curriculum, CurriculumLesson } from '#shared/types/catalog'

interface Props {
  curriculum: Curriculum
}

const props = defineProps<Props>()
const { t } = useI18n()

function formatLessonDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return ''
  }
  const totalMinutes = Math.round(seconds / 60)
  if (totalMinutes < 60) {
    return `${totalMinutes} ${t('landing.duration.minutes_short')}`
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (minutes === 0) {
    return `${hours} ${t('landing.duration.hours_short')}`
  }
  return `${hours} ${t('landing.duration.hours_short')} ${minutes} ${t('landing.duration.minutes_short')}`
}

function moduleSummary(lessonsCount: number, durationMinutes: number): string {
  const lessonsLabel = t('landing.course.lessons_count', { count: lessonsCount })
  if (durationMinutes <= 0) {
    return lessonsLabel
  }
  return `${lessonsLabel} · ${durationMinutes} ${t('landing.duration.minutes_short')}`
}

const items = computed<AccordionItem[]>(() =>
  props.curriculum.modules.map(module => ({
    label: module.title,
    description: moduleSummary(module.lessons.length, module.duration_minutes),
    slot: `module-${module.id}` as const,
    value: String(module.id)
  }))
)

function lessonsForSlot(slot: string): CurriculumLesson[] {
  const id = Number(slot.replace(/^module-/, ''))
  const found = props.curriculum.modules.find(m => m.id === id)
  return found?.lessons ?? []
}

const isEmpty = computed(() =>
  props.curriculum.modules.length === 0 && props.curriculum.orphan_lessons.length === 0
)
</script>

<template>
  <section class="space-y-4">
    <h2 class="text-2xl font-medium tracking-tight">
      {{ t('landing.course.section.curriculum.title') }}
    </h2>

    <p
      v-if="isEmpty"
      class="text-sm text-muted"
    >
      {{ t('landing.course.section.curriculum.empty') }}
    </p>

    <UAccordion
      v-if="curriculum.modules.length > 0"
      :items="items"
    >
      <template
        v-for="module in curriculum.modules"
        :key="module.id"
        #[`module-${module.id}`]
      >
        <ul class="space-y-3 py-2">
          <li
            v-for="lesson in lessonsForSlot(`module-${module.id}`)"
            :key="lesson.id"
            class="flex items-center justify-between gap-4"
          >
            <div class="flex items-center gap-2 min-w-0">
              <UTooltip
                v-if="lesson.is_preview"
                :text="t('landing.course.lesson.preview_tooltip')"
              >
                <UIcon
                  name="i-lucide-play-circle"
                  class="size-4 text-primary shrink-0"
                />
              </UTooltip>
              <UIcon
                v-else
                name="i-lucide-lock"
                class="size-4 text-muted shrink-0"
              />
              <span class="text-sm truncate">{{ lesson.title }}</span>
            </div>
            <span
              v-if="formatLessonDuration(lesson.duration_seconds)"
              class="text-xs text-muted shrink-0 tabular-nums"
            >
              {{ formatLessonDuration(lesson.duration_seconds) }}
            </span>
          </li>
        </ul>
      </template>
    </UAccordion>

    <div
      v-if="curriculum.orphan_lessons.length > 0"
      class="space-y-3 pt-2"
    >
      <h3 class="text-base font-medium">
        {{ t('landing.course.section.curriculum.orphan_heading') }}
      </h3>
      <ul class="space-y-3">
        <li
          v-for="lesson in curriculum.orphan_lessons"
          :key="lesson.id"
          class="flex items-center justify-between gap-4"
        >
          <div class="flex items-center gap-2 min-w-0">
            <UTooltip
              v-if="lesson.is_preview"
              :text="t('landing.course.lesson.preview_tooltip')"
            >
              <UIcon
                name="i-lucide-play-circle"
                class="size-4 text-primary shrink-0"
              />
            </UTooltip>
            <UIcon
              v-else
              name="i-lucide-lock"
              class="size-4 text-muted shrink-0"
            />
            <span class="text-sm truncate">{{ lesson.title }}</span>
          </div>
          <span
            v-if="formatLessonDuration(lesson.duration_seconds)"
            class="text-xs text-muted shrink-0 tabular-nums"
          >
            {{ formatLessonDuration(lesson.duration_seconds) }}
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>
