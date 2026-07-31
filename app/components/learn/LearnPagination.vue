<script setup lang="ts">
import type { LearnLeaf } from '~/composables/useLearnNavigation'
import { isLeafLocked, leafLock, leafToPath } from '~/composables/useLearnNavigation'

interface Props {
  prev: LearnLeaf | null
  next: LearnLeaf | null
  /** Highlight the "Next" button as primary — true when current entity is completed. */
  nextHighlighted: boolean
}

const { prev, next, nextHighlighted } = defineProps<Props>()
const { t } = useI18n()

// The next stop is shown even when locked — that is exactly the moment the
// learner needs to understand why they have stopped. It just does not
// navigate: dropping `to` rather than relying on `disabled` alone keeps
// UButton from rendering a still-clickable anchor.
const nextLocked = computed(() => (next ? isLeafLocked(next) : false))
// Inline rather than a tooltip: a disabled button receives no hover
// events, so the reason has to sit in the label itself.
const { tooltipText: nextLockReason } = useCurriculumLock(() => (next ? leafLock(next) : null))
// Everything before the frontier is open, so this should never fire.
// Handled symmetrically rather than assumed.
const prevLocked = computed(() => (prev ? isLeafLocked(prev) : false))

const highlightNext = computed(() => nextHighlighted && !nextLocked.value)

function leafTitle(leaf: LearnLeaf): string {
  switch (leaf.kind) {
    case 'topic':
      return leaf.topic.title
    case 'lesson':
      return leaf.lesson.title
    case 'session':
      return leaf.session.title
    case 'quiz':
      return leaf.quiz.title
  }
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
      :to="prevLocked ? undefined : leafToPath(prev)"
      :disabled="prevLocked"
      :icon="prevLocked ? 'i-lucide-lock' : 'i-lucide-arrow-left'"
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
      :to="nextLocked ? undefined : leafToPath(next)"
      :disabled="nextLocked"
      :trailing-icon="nextLocked ? 'i-lucide-lock' : 'i-lucide-arrow-right'"
      :variant="highlightNext ? 'solid' : 'ghost'"
      :color="highlightNext ? 'primary' : 'neutral'"
      class="flex-1 justify-end"
    >
      <span class="flex flex-col items-end text-end min-w-0">
        <span
          class="text-xs truncate max-w-xs"
          :class="highlightNext ? 'opacity-80' : 'text-muted'"
        >
          {{ nextLocked ? (nextLockReason || t('learn.pagination.locked')) : t('learn.pagination.next') }}
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
