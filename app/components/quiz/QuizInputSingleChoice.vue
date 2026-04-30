<script setup lang="ts">
import type {
  QuizQuestion,
  QuizQuestionAnswerOption,
  SingleChoiceAnswerData
} from '#shared/types/quiz'

interface Props {
  question: QuizQuestion
  initialData: SingleChoiceAnswerData | null
  isReadonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReadonly: false
})

const emit = defineEmits<{
  update: [data: SingleChoiceAnswerData]
}>()

const selectedId = ref<string>(props.initialData?.answer_id ?? '')

watch(
  () => props.question.id,
  () => {
    selectedId.value = props.initialData?.answer_id ?? ''
  }
)

watch(
  () => props.initialData?.answer_id,
  (next) => {
    if (next && next !== selectedId.value) {
      selectedId.value = next
    }
  }
)

const answers = computed<QuizQuestionAnswerOption[]>(() =>
  props.question.type === 'single_choice' ? props.question.answers : []
)

function onChange(value: string | number | boolean | null | undefined): void {
  if (props.isReadonly) return
  if (typeof value !== 'string' || value.length === 0) return
  if (selectedId.value === value) return
  selectedId.value = value
  emit('update', { answer_id: value })
}

function rowClass(answer: QuizQuestionAnswerOption): string {
  if (!props.isReadonly) return ''
  const isSelected = selectedId.value === answer.id
  if (answer.is_correct === true) return 'text-success'
  if (isSelected && answer.is_correct === false) return 'text-error'
  return 'text-default'
}

function rowIcon(answer: QuizQuestionAnswerOption): string | null {
  if (!props.isReadonly) return null
  const isSelected = selectedId.value === answer.id
  if (answer.is_correct === true) return 'i-lucide-check-circle-2'
  if (isSelected && answer.is_correct === false) return 'i-lucide-x-circle'
  return null
}
</script>

<template>
  <div
    v-if="!isReadonly"
    role="radiogroup"
    class="space-y-2"
  >
    <label
      v-for="answer in answers"
      :key="answer.id"
      class="flex items-center gap-3 cursor-pointer rounded-md border border-default px-3 py-2 hover:bg-elevated"
      :class="{ 'border-primary bg-elevated': selectedId === answer.id }"
    >
      <input
        type="radio"
        :name="`q-${question.id}`"
        :value="answer.id"
        :checked="selectedId === answer.id"
        class="accent-primary"
        @change="onChange(answer.id)"
      >
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
      <span :class="{ 'font-medium': selectedId === answer.id }">
        {{ answer.text }}
      </span>
      <UBadge
        v-if="selectedId === answer.id"
        size="xs"
        color="neutral"
        variant="subtle"
      >
        {{ $t('quiz.results.yourAnswer') }}
      </UBadge>
    </div>
  </div>
</template>
