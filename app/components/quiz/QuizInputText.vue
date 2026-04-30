<script setup lang="ts">
import type { QuizQuestion, TextAnswerData } from '#shared/types/quiz'

interface Props {
  question: QuizQuestion
  initialData: TextAnswerData | null
  isReadonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReadonly: false
})

const emit = defineEmits<{
  update: [data: TextAnswerData]
  blur: []
}>()

const text = ref<string>(props.initialData?.text ?? '')

watch(
  () => props.question.id,
  () => {
    text.value = props.initialData?.text ?? ''
  }
)

watch(
  () => props.initialData?.text,
  (next) => {
    if (typeof next === 'string' && next !== text.value) {
      text.value = next
    }
  }
)

function onInput(value: string | number): void {
  if (props.isReadonly) return
  const str = String(value)
  text.value = str
  emit('update', { text: str })
}

function onBlur(): void {
  if (props.isReadonly) return
  emit('blur')
}
</script>

<template>
  <div class="space-y-3">
    <UTextarea
      :model-value="text"
      :rows="3"
      autoresize
      :placeholder="$t('quiz.input.text.placeholder')"
      :disabled="isReadonly"
      :maxrows="10"
      :ui="{ base: 'w-full' }"
      @update:model-value="onInput"
      @blur="onBlur"
    />

    <div
      v-if="isReadonly && question.type === 'text' && (question.correct_text || question.match_mode)"
      class="rounded-md border border-default bg-elevated p-3 text-sm space-y-1"
    >
      <div class="text-muted">
        {{ $t('quiz.results.correctAnswer') }}
      </div>
      <div
        v-if="question.correct_text"
        class="font-medium text-success"
      >
        {{ question.correct_text }}
      </div>
      <div
        v-if="question.match_mode"
        class="text-xs text-muted"
      >
        {{ question.match_mode }}
      </div>
    </div>
  </div>
</template>
