<script setup lang="ts">
import type { LearnLeaf } from '~/composables/useLearnNavigation'
import { leafLock, leafToPath } from '~/composables/useLearnNavigation'
import { useCurriculumLock } from '~/composables/useCurriculumLock'
import { formatDuration } from '~/utils/formatDuration'

// CurriculumRailLeaf renders only lesson/topic leaves. Session leaves are
// dispatched to <CurriculumRailSessionLeaf> by the rail (Phase 7.6).
type LessonOrTopicLeaf = Extract<LearnLeaf, { kind: 'lesson' | 'topic' }>

interface Props {
  leaf: LessonOrTopicLeaf
  isCurrent: boolean
}

const { leaf, isCurrent } = defineProps<Props>()
const { t } = useI18n()

const title = computed(() =>
  leaf.kind === 'topic' ? leaf.topic.title : leaf.lesson.title
)

const durationSeconds = computed(() =>
  leaf.kind === 'topic'
    ? leaf.topic.duration_seconds
    : leaf.lesson.duration_seconds
)

const status = computed(() =>
  leaf.kind === 'topic' ? leaf.topic.progress.status : leaf.lesson.progress.status
)

const { isLocked, tooltipText } = useCurriculumLock(() => leafLock(leaf))

const iconName = computed(() => {
  if (isLocked.value) {
    return 'i-lucide-lock'
  }
  switch (status.value) {
    case 'completed':
      return 'i-lucide-check-circle-2'
    case 'in_progress':
      return 'i-lucide-play-circle'
    default:
      return 'i-lucide-circle'
  }
})

const iconColorClass = computed(() => {
  if (isLocked.value) {
    return 'text-muted'
  }
  switch (status.value) {
    case 'completed':
      return 'text-success'
    case 'in_progress':
      return 'text-primary'
    default:
      return 'text-muted'
  }
})

const indentClass = computed(() => (leaf.kind === 'topic' ? 'ps-7' : 'ps-3'))

const durationUnits = computed(() => ({
  hours: t('landing.duration.hours_short'),
  minutes: t('landing.duration.minutes_short')
}))

const durationLabel = computed(() =>
  formatDuration(durationSeconds.value / 3600, durationUnits.value)
)

const path = computed(() => leafToPath(leaf))
</script>

<template>
  <!--
    A locked row stays visible so the learner can see what is ahead, but
    renders as a non-navigating div: the backend would 403 the request
    anyway, and a dead link that looks live is worse than one that says why.
  -->
  <UTooltip
    v-if="isLocked"
    :text="tooltipText"
  >
    <div
      class="flex items-center gap-2 pe-3 py-2 text-sm rounded-md text-muted opacity-60 cursor-not-allowed"
      :class="indentClass"
      aria-disabled="true"
    >
      <UIcon
        :name="iconName"
        class="size-4 shrink-0"
        :class="iconColorClass"
      />
      <span class="truncate flex-1">{{ title }}</span>
      <span class="sr-only">{{ tooltipText }}</span>
    </div>
  </UTooltip>
  <NuxtLink
    v-else
    :to="path"
    class="flex items-center gap-2 pe-3 py-2 text-sm rounded-md transition-colors"
    :class="[
      isCurrent
        ? 'bg-primary-50 dark:bg-primary-950 text-primary font-medium'
        : 'text-default hover:bg-elevated',
      indentClass
    ]"
    :aria-current="isCurrent ? 'page' : undefined"
  >
    <UIcon
      :name="iconName"
      class="size-4 shrink-0"
      :class="iconColorClass"
    />
    <span class="truncate flex-1">{{ title }}</span>
    <span
      v-if="durationLabel"
      class="text-xs text-muted shrink-0"
    >
      {{ durationLabel }}
    </span>
  </NuxtLink>
</template>
