<script setup lang="ts">
import type {
  MultipleChoiceAnswerData,
  QuizQuestion,
  QuizQuestionAnswerOption
} from '#shared/types/quiz'

interface Props {
  question: QuizQuestion
  initialData: MultipleChoiceAnswerData | null
  isReadonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReadonly: false
})

const emit = defineEmits<{
  update: [data: MultipleChoiceAnswerData]
}>()

const selected = ref<Set<string>>(new Set(props.initialData?.answer_ids ?? []))

watch(
  () => props.question.id,
  () => {
    selected.value = new Set(props.initialData?.answer_ids ?? [])
  }
)

watch(
  () => props.initialData?.answer_ids,
  (next) => {
    if (!next) return
    const incoming = new Set(next)
    if (incoming.size !== selected.value.size
      || [...incoming].some(id => !selected.value.has(id))) {
      selected.value = incoming
    }
  }
)

const answers = computed<QuizQuestionAnswerOption[]>(() =>
  props.question.type === 'multiple_choice' ? props.question.answers : []
)

function isChecked(answerId: string): boolean {
  return selected.value.has(answerId)
}

function emitUpdate(): void {
  const ids = [...selected.value].sort()
  emit('update', { answer_ids: ids })
}

function onToggle(answerId: string, value: boolean | undefined): void {
  if (props.isReadonly) return
  const next = new Set(selected.value)
  if (value === true) {
    next.add(answerId)
  } else {
    next.delete(answerId)
  }
  selected.value = next
  emitUpdate()
}

function rowClass(answer: QuizQuestionAnswerOption): string {
  if (!props.isReadonly) return ''
  const isSelected = isChecked(answer.id)
  if (answer.is_correct === true) return 'text-success'
  if (isSelected && answer.is_correct === false) return 'text-error'
  return 'text-default'
}

function rowIcon(answer: QuizQuestionAnswerOption): string | null {
  if (!props.isReadonly) return null
  const isSelected = isChecked(answer.id)
  if (answer.is_correct === true) return 'i-lucide-check-circle-2'
  if (isSelected && answer.is_correct === false) return 'i-lucide-x-circle'
  return null
}
</script>

<template>
  <div
    v-if="!isReadonly"
    class="space-y-2"
  >
    <label
      v-for="answer in answers"
      :key="answer.id"
      class="flex items-center gap-3 cursor-pointer rounded-md border border-default px-3 py-2 hover:bg-elevated"
      :class="{ 'border-primary bg-elevated': isChecked(answer.id) }"
    >
      <UCheckbox
        :model-value="isChecked(answer.id)"
        @update:model-value="onToggle(answer.id, $event)"
      />
      <span class="text-sm">{{ answer.text }}</span>
    </label>
  </div>

  <div
    v-else
    class="space-y-1"
  >
    <div
      v-for="answer in answers"
      :key="answer.id"
      class="flex items-center gap-2 text-sm"
      :class="rowClass(answer)"
    >
      <UIcon
        v-if="rowIcon(answer)"
        :name="rowIcon(answer)!"
        class="size-4 shrink-0"
      />
      <span :class="{ 'font-medium': isChecked(answer.id) }">
        {{ answer.text }}
      </span>
      <UBadge
        v-if="isChecked(answer.id)"
        size="xs"
        color="neutral"
        variant="subtle"
      >
        {{ $t('quiz.results.yourAnswer') }}
      </UBadge>
    </div>
  </div>
</template>
