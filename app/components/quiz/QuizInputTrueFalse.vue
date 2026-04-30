<script setup lang="ts">
import type {
  QuizQuestion,
  QuizQuestionAnswerOption,
  TrueFalseAnswerData
} from '#shared/types/quiz'

interface Props {
  question: QuizQuestion
  initialData: TrueFalseAnswerData | null
  isReadonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReadonly: false
})

const emit = defineEmits<{
  update: [data: TrueFalseAnswerData]
}>()

const { t } = useI18n()

const selected = ref<boolean | null>(props.initialData?.value ?? null)

watch(
  () => props.question.id,
  () => {
    selected.value = props.initialData?.value ?? null
  }
)

watch(
  () => props.initialData?.value,
  (next) => {
    if (typeof next === 'boolean' && next !== selected.value) {
      selected.value = next
    }
  }
)

interface Choice {
  value: boolean
  label: string
  meta: QuizQuestionAnswerOption | null
}

/**
 * Backend stores both labels in `answers[]`. Use the entry whose `text`
 * lower-cases to "true" / "false" as the canonical row; fall back to
 * order if text isn't normalized.
 */
const choices = computed<Choice[]>(() => {
  if (props.question.type !== 'true_false') return []
  const tEntry = props.question.answers.find(a => a.text.trim().toLowerCase() === 'true')
    ?? props.question.answers[0]
    ?? null
  const fEntry = props.question.answers.find(a => a.text.trim().toLowerCase() === 'false')
    ?? props.question.answers[1]
    ?? null
  return [
    { value: true, label: t('quiz.input.trueFalse.true'), meta: tEntry },
    { value: false, label: t('quiz.input.trueFalse.false'), meta: fEntry }
  ]
})

function onChange(value: boolean): void {
  if (props.isReadonly) return
  if (selected.value === value) return
  selected.value = value
  emit('update', { value })
}

function rowClass(choice: Choice): string {
  if (!props.isReadonly) return ''
  const isSelected = selected.value === choice.value
  if (choice.meta?.is_correct === true) return 'text-success'
  if (isSelected && choice.meta?.is_correct === false) return 'text-error'
  return 'text-default'
}

function rowIcon(choice: Choice): string | null {
  if (!props.isReadonly) return null
  const isSelected = selected.value === choice.value
  if (choice.meta?.is_correct === true) return 'i-lucide-check-circle-2'
  if (isSelected && choice.meta?.is_correct === false) return 'i-lucide-x-circle'
  return null
}
</script>

<template>
  <div
    v-if="!isReadonly"
    role="radiogroup"
    class="grid grid-cols-2 gap-3"
  >
    <label
      v-for="choice in choices"
      :key="String(choice.value)"
      class="flex items-center gap-3 cursor-pointer rounded-md border border-default px-3 py-2 hover:bg-elevated"
      :class="{ 'border-primary bg-elevated': selected === choice.value }"
    >
      <input
        type="radio"
        :name="`q-${question.id}`"
        :checked="selected === choice.value"
        class="accent-primary"
        @change="onChange(choice.value)"
      >
      <span class="text-sm">{{ choice.label }}</span>
    </label>
  </div>

  <div
    v-else
    class="space-y-1"
  >
    <div
      v-for="choice in choices"
      :key="String(choice.value)"
      class="flex items-center gap-2 text-sm"
      :class="rowClass(choice)"
    >
      <UIcon
        v-if="rowIcon(choice)"
        :name="rowIcon(choice)!"
        class="size-4 shrink-0"
      />
      <span :class="{ 'font-medium': selected === choice.value }">
        {{ choice.label }}
      </span>
      <UBadge
        v-if="selected === choice.value"
        size="xs"
        color="neutral"
        variant="subtle"
      >
        {{ $t('quiz.results.yourAnswer') }}
      </UBadge>
    </div>
  </div>
</template>
