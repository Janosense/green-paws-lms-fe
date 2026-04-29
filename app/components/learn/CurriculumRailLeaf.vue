<script setup lang="ts">
import type { LearnLeaf } from '~/composables/useLearnNavigation'
import { leafToPath } from '~/composables/useLearnNavigation'
import { formatDuration } from '~/utils/formatDuration'

interface Props {
  leaf: LearnLeaf
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

const iconName = computed(() => {
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
  <NuxtLink
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
