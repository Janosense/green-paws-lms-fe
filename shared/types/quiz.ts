/**
 * Phase 6.2 wire-shape contracts for the quiz subsystem.
 *
 * Mirrors the response shapes produced by Phase 6.1 backend
 * (`Api/QuizAttemptsController` + `Quiz/QuestionDeliveryTransformer` +
 * `Quiz/AttemptStateResult` + `Quiz/SaveAnswerResult`).
 *
 * Discriminated unions match the backend's per-question-type variation:
 * `QuizQuestion` is keyed by `type`, and `AnswerData` is keyed by the
 * shape of its single payload property.
 *
 * @author Tymofii Synianskyi
 */

import type { ApiEnvelope } from './api'

// ----------------------------------------------------------------------
// Question delivery
// ----------------------------------------------------------------------

export type QuizQuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'text'

export type TextMatchMode = 'exact' | 'case_insensitive' | 'regex'

export interface QuizQuestionAnswerOption {
  /** UUID frozen on the question CPT meta. */
  id: string
  text: string
  /** Present only when reveal=true (post-submit per policy). */
  is_correct?: boolean
}

export interface QuizQuestionBase {
  id: number
  title: string
  /** Empty string from backend when no media; treated as null in templates. */
  media_url: string | null
  points: number
  /** Sanitized HTML; reveal=true only. */
  explanation?: string
}

export interface QuizQuestionSingleChoice extends QuizQuestionBase {
  type: 'single_choice'
  answers: QuizQuestionAnswerOption[]
}

export interface QuizQuestionMultipleChoice extends QuizQuestionBase {
  type: 'multiple_choice'
  answers: QuizQuestionAnswerOption[]
}

export interface QuizQuestionTrueFalse extends QuizQuestionBase {
  type: 'true_false'
  /** Always two entries — the labels for true and false (instructor-supplied). */
  answers: QuizQuestionAnswerOption[]
}

export interface QuizQuestionText extends QuizQuestionBase {
  type: 'text'
  /** Reveal=true only. */
  correct_text?: string
  /** Reveal=true only. */
  match_mode?: TextMatchMode
}

export type QuizQuestion
  = | QuizQuestionSingleChoice
    | QuizQuestionMultipleChoice
    | QuizQuestionTrueFalse
    | QuizQuestionText

// ----------------------------------------------------------------------
// Answer payloads
// ----------------------------------------------------------------------

export interface SingleChoiceAnswerData { answer_id: string }
export interface MultipleChoiceAnswerData { answer_ids: string[] }
export interface TrueFalseAnswerData { value: boolean }
export interface TextAnswerData { text: string }

export type AnswerData
  = | SingleChoiceAnswerData
    | MultipleChoiceAnswerData
    | TrueFalseAnswerData
    | TextAnswerData

export interface QuizSavedAnswer {
  question_id: number
  answer_data: AnswerData
  /** Populated only on a finalized attempt with reveal=true policy. */
  is_correct?: boolean | null
  /** Same. */
  points_awarded?: number | null
  answered_at: string
}

// ----------------------------------------------------------------------
// Attempt + envelopes
// ----------------------------------------------------------------------

export type QuizAttemptStatus = 'in_progress' | 'submitted' | 'expired' | 'abandoned'

export interface QuizAttempt {
  id: number
  quiz_id: number
  course_id: number
  status: QuizAttemptStatus
  started_at: string
  submitted_at: string | null
  /** 0 = no time limit. */
  time_limit_seconds: number
  /** Backend-computed snapshot at the time of the request; null when unlimited. */
  time_remaining_seconds: number | null
  time_taken_seconds: number | null
  max_score: number
  score: number | null
  passed: boolean | null
  passing_threshold: number
  question_order: number[]
}

export interface QuizAttemptStateResponse {
  attempt: QuizAttempt
  questions: QuizQuestion[]
  saved_answers: QuizSavedAnswer[]
}

export type QuizAttemptStateEnvelope = ApiEnvelope<QuizAttemptStateResponse>

export interface QuizSaveAnswerResponse {
  answer: QuizSavedAnswer | null
  expired: boolean
  /** Populated when expired=true (backend returns the finalized attempt). */
  attempt?: QuizAttempt
}

export type QuizSaveAnswerEnvelope = ApiEnvelope<QuizSaveAnswerResponse>
