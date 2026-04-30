<script setup lang="ts">
interface Props {
  isFirst: boolean
  isLast: boolean
  answeredCount: number
  totalCount: number
  isSubmitting: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  prev: []
  next: []
  submit: []
}>()
</script>

<template>
  <div class="flex items-center justify-between gap-3 pt-4 border-t border-default">
    <UButton
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-left"
      :disabled="isFirst || isSubmitting"
      @click="emit('prev')"
    >
      {{ $t('quiz.player.previous') }}
    </UButton>

    <span class="text-xs text-muted">
      {{ $t('quiz.player.answeredCount', { answered: answeredCount, total: totalCount }) }}
    </span>

    <UButton
      v-if="!isLast"
      color="primary"
      trailing-icon="i-lucide-arrow-right"
      :disabled="isSubmitting"
      @click="emit('next')"
    >
      {{ $t('quiz.player.next') }}
    </UButton>
    <UButton
      v-else
      color="primary"
      icon="i-lucide-check-circle"
      :loading="isSubmitting"
      @click="emit('submit')"
    >
      {{ $t('quiz.player.finish') }}
    </UButton>
  </div>
</template>
