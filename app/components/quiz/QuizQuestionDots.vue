<script setup lang="ts">
interface Props {
  total: number
  currentIndex: number
  answeredIndices: number[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  jump: [index: number]
}>()

const { t } = useI18n()

const answeredSet = computed(() => new Set(props.answeredIndices))

function isAnswered(index: number): boolean {
  return answeredSet.value.has(index)
}

function isCurrent(index: number): boolean {
  return index === props.currentIndex
}

function ariaLabel(index: number): string {
  const base = t('quiz.player.dotLabel', { n: index + 1 })
  if (isAnswered(index)) {
    return `${base}, ${t('quiz.player.dotAnswered')}`
  }
  return base
}

function onJump(index: number): void {
  if (index === props.currentIndex) return
  emit('jump', index)
}
</script>

<template>
  <nav
    class="flex flex-wrap gap-2 overflow-x-auto p-1"
    :aria-label="t('quiz.player.questionsNav')"
  >
    <button
      v-for="i in total"
      :key="i - 1"
      type="button"
      :aria-current="isCurrent(i - 1) ? 'step' : undefined"
      :aria-label="ariaLabel(i - 1)"
      class="size-8 rounded-full text-xs font-medium border transition-colors"
      :class="[
        isAnswered(i - 1)
          ? 'bg-primary text-inverted border-primary'
          : 'bg-default text-default border-default',
        isCurrent(i - 1)
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-default'
          : ''
      ]"
      @click="onJump(i - 1)"
    >
      {{ i }}
    </button>
  </nav>
</template>
