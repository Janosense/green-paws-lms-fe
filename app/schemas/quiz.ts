import { z, type ZodTypeAny } from 'zod'
import type { QuizQuestionType } from '#shared/types/quiz'

/**
 * Per-question-type answer payload schemas.
 *
 * These exist to short-circuit obviously-malformed payloads at the input
 * boundary so the user gets immediate feedback without a server round-
 * trip. The backend re-validates on every PATCH (`invalid_answer_data`)
 * so the schemas are advisory, not authoritative.
 *
 * Error messages are i18n keys, never user-facing strings.
 *
 * @author Tymofii Synianskyi
 */

export const singleChoiceAnswerSchema = z.object({
  answer_id: z.string().trim().min(1, { message: 'quiz.errors.invalidAnswer' })
})

export const multipleChoiceAnswerSchema = z.object({
  answer_ids: z
    .array(z.string().trim().min(1))
    .min(1, { message: 'quiz.errors.invalidAnswer' })
})

export const trueFalseAnswerSchema = z.object({
  value: z.boolean({ message: 'quiz.errors.invalidAnswer' })
})

export const textAnswerSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, { message: 'quiz.errors.invalidAnswer' })
    .max(5000, { message: 'quiz.errors.invalidAnswer' })
})

export type SingleChoiceAnswerInput = z.infer<typeof singleChoiceAnswerSchema>
export type MultipleChoiceAnswerInput = z.infer<typeof multipleChoiceAnswerSchema>
export type TrueFalseAnswerInput = z.infer<typeof trueFalseAnswerSchema>
export type TextAnswerInput = z.infer<typeof textAnswerSchema>

/**
 * Pick the schema that matches a question's `type` discriminator.
 *
 * Components route their emitted `update` payload through the matching
 * schema before calling `quizAttemptStore.saveAnswer(...)` so the store
 * never sees a payload that the backend would reject outright.
 */
export function answerSchemaFor(type: QuizQuestionType): ZodTypeAny {
  switch (type) {
    case 'single_choice':
      return singleChoiceAnswerSchema
    case 'multiple_choice':
      return multipleChoiceAnswerSchema
    case 'true_false':
      return trueFalseAnswerSchema
    case 'text':
      return textAnswerSchema
  }
}
