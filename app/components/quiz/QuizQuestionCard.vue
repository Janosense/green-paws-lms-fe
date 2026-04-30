<script setup lang="ts">
import type {
  AnswerData,
  MultipleChoiceAnswerData,
  QuizQuestion,
  QuizSavedAnswer,
  QuizSaveAnswerResponse,
  SingleChoiceAnswerData,
  TextAnswerData,
  TrueFalseAnswerData
} from '#shared/types/quiz'

interface Props {
  question: QuizQuestion
  initialAnswer: QuizSavedAnswer | null
  slug: string
  isReadonly?: boolean
  questionNumber: number
}

const props = withDefaults(defineProps<Props>(), {
  isReadonly: false
})

const emit = defineEmits<{
  flushReady: [flush: () => Promise<void>]
}>()

const quizAttemptStore = useQuizAttemptStore()

const questionType = computed(() => props.question.type)

const autosave = useQuizAutosave({
  questionId: () => props.question.id,
  questionType,
  onSave: (data: AnswerData): Promise<QuizSaveAnswerResponse> =>
    quizAttemptStore.saveAnswer(props.slug, props.question.id, data)
})

const initialSingle = computed<SingleChoiceAnswerData | null>(() => {
  if (props.question.type !== 'single_choice') return null
  const data = props.initialAnswer?.answer_data as SingleChoiceAnswerData | undefined
  return data && 'answer_id' in data ? data : null
})
const initialMultiple = computed<MultipleChoiceAnswerData | null>(() => {
  if (props.question.type !== 'multiple_choice') return null
  const data = props.initialAnswer?.answer_data as MultipleChoiceAnswerData | undefined
  return data && 'answer_ids' in data ? data : null
})
const initialTrueFalse = computed<TrueFalseAnswerData | null>(() => {
  if (props.question.type !== 'true_false') return null
  const data = props.initialAnswer?.answer_data as TrueFalseAnswerData | undefined
  return data && 'value' in data ? data : null
})
const initialText = computed<TextAnswerData | null>(() => {
  if (props.question.type !== 'text') return null
  const data = props.initialAnswer?.answer_data as TextAnswerData | undefined
  return data && 'text' in data ? data : null
})

function onUpdate(data: AnswerData): void {
  if (props.isReadonly) return
  autosave.schedule(data)
}

async function flush(): Promise<void> {
  await autosave.flush()
}

defineExpose({ flush })

// Surface flush to the parent via event so QuizPlayer can call it on
// prev/next/submit without prop drilling a bound function.
onMounted(() => {
  emit('flushReady', flush)
})
</script>

<template>
  <article class="space-y-4">
    <header class="space-y-2">
      <p class="text-xs uppercase tracking-wide text-muted">
        {{ $t('quiz.player.questionNumber', { n: questionNumber }) }} · {{ question.points }} {{ $t('quiz.player.pointsShort') }}
      </p>
      <h2 class="text-lg md:text-xl font-medium">
        {{ question.title }}
      </h2>
      <img
        v-if="question.media_url"
        :src="question.media_url"
        :alt="question.title"
        loading="lazy"
        class="rounded-md max-w-full md:max-w-2xl"
      >
    </header>

    <div class="space-y-3">
      <QuizInputSingleChoice
        v-if="question.type === 'single_choice'"
        :question="question"
        :initial-data="initialSingle"
        :is-readonly="isReadonly"
        @update="onUpdate"
      />
      <QuizInputMultipleChoice
        v-else-if="question.type === 'multiple_choice'"
        :question="question"
        :initial-data="initialMultiple"
        :is-readonly="isReadonly"
        @update="onUpdate"
      />
      <QuizInputTrueFalse
        v-else-if="question.type === 'true_false'"
        :question="question"
        :initial-data="initialTrueFalse"
        :is-readonly="isReadonly"
        @update="onUpdate"
      />
      <QuizInputText
        v-else
        :question="question"
        :initial-data="initialText"
        :is-readonly="isReadonly"
        @update="onUpdate"
        @blur="flush"
      />
    </div>

    <div
      v-if="!isReadonly"
      class="text-xs text-muted h-4"
      aria-live="polite"
    >
      <span v-if="autosave.hasPendingFlush.value">
        {{ $t('quiz.player.saving') }}
      </span>
    </div>

    <div
      v-if="isReadonly && question.explanation"
      class="rounded-md border border-default bg-elevated p-3"
    >
      <p class="text-xs uppercase tracking-wide text-muted mb-1">
        {{ $t('quiz.results.explanation') }}
      </p>
      <!-- eslint-disable-next-line vue/no-v-html -- Backend sanitises with wp_kses_post before sending. -->
      <div
        class="prose prose-sm max-w-none"
        v-html="question.explanation"
      />
    </div>
  </article>
</template>
