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
  /** Phase 9.5 — live CPT title for the quiz; cosmetic only. */
  quiz_title: string
  course_id: number
  /** Course `post_name`; lets the quiz page hydrate the curriculum rail + pagination. */
  course_slug: string
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
  /** Phase 9.5 — null when `_vl_quiz_max_attempts` is 0 (unlimited). */
  attempts_remaining: number | null
  /** Phase 9.5 — highest score percentage across submitted attempts; null until first submit. */
  best_score: number | null
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

// ----------------------------------------------------------------------
// Attempt history
// ----------------------------------------------------------------------

/**
 * One row of `GET /vl/v1/quizzes/{slug}/attempts`.
 *
 * Leaner than {@link QuizAttempt}: no `question_order` and no
 * `time_remaining_seconds`, both of which only mean something for the
 * attempt currently loaded in the player. `score_percent` is derived
 * backend-side so the client can compare against `passing_threshold`
 * (a percentage) without redoing the division per row.
 */
export interface QuizAttemptHistoryEntry {
  id: number
  /** 1-based, chronological. Attempt 1 is the learner's first sitting. */
  attempt_number: number
  status: QuizAttemptStatus
  started_at: string
  submitted_at: string | null
  score: number | null
  max_score: number
  /** Null when never scored or the snapshot carried no points. */
  score_percent: number | null
  /** Null while `in_progress`. */
  passed: boolean | null
  passing_threshold: number
  time_taken_seconds: number | null
}

export interface QuizAttemptHistoryResponse {
  quiz_id: number
  quiz_title: string
  /** 0 when the learner has no attempts — there is no row to read it off. */
  course_id: number
  course_slug: string
  /** 0 = unlimited. */
  max_attempts: number
  /** Null when unlimited. */
  attempts_remaining: number | null
  /** Every sitting, including still-open ones. */
  total_attempts: number
  /** Sittings in a terminal state (`submitted` + `expired`). */
  graded_attempts: number
  /** Highest percentage across `submitted` attempts; null until the first. */
  best_score: number | null
  passed: boolean
  /** `attempt_number` of the first passing sitting; null if never passed. */
  passed_on_attempt: number | null
  attempts: QuizAttemptHistoryEntry[]
}

export type QuizAttemptHistoryEnvelope = ApiEnvelope<QuizAttemptHistoryResponse>
