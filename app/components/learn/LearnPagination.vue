<script setup lang="ts">
import type { LearnLeaf } from '~/composables/useLearnNavigation'
import { leafToPath } from '~/composables/useLearnNavigation'

interface Props {
  prev: LearnLeaf | null
  next: LearnLeaf | null
  /** Highlight the "Next" button as primary — true when current entity is completed. */
  nextHighlighted: boolean
}

const { prev, next, nextHighlighted } = defineProps<Props>()
const { t } = useI18n()

function leafTitle(leaf: LearnLeaf): string {
  return leaf.kind === 'topic' ? leaf.topic.title : leaf.lesson.title
}
</script>

<template>
  <nav
    v-if="prev || next"
    class="flex items-stretch gap-3 mt-12 pt-6 border-t border-default"
    :aria-label="t('learn.pagination.label')"
  >
    <UButton
      v-if="prev"
      :to="leafToPath(prev)"
      icon="i-lucide-arrow-left"
      variant="ghost"
      color="neutral"
      class="flex-1 justify-start"
    >
      <span class="flex flex-col items-start text-start min-w-0">
        <span class="text-xs text-muted">{{ t('learn.pagination.prev') }}</span>
        <span class="text-sm truncate max-w-xs">{{ leafTitle(prev) }}</span>
      </span>
    </UButton>
    <div
      v-else
      class="flex-1"
    />

    <UButton
      v-if="next"
      :to="leafToPath(next)"
      trailing-icon="i-lucide-arrow-right"
      :variant="nextHighlighted ? 'solid' : 'ghost'"
      :color="nextHighlighted ? 'primary' : 'neutral'"
      class="flex-1 justify-end"
    >
      <span class="flex flex-col items-end text-end min-w-0">
        <span
          class="text-xs"
          :class="nextHighlighted ? 'opacity-80' : 'text-muted'"
        >
          {{ t('learn.pagination.next') }}
        </span>
        <span class="text-sm truncate max-w-xs">{{ leafTitle(next) }}</span>
      </span>
    </UButton>
    <div
      v-else
      class="flex-1"
    />
  </nav>
</template>
