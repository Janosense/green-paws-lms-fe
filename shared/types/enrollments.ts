/**
 * Phase 4.1 wire-shape contracts for `vl/v1/enrollments` (POST + GET /me).
 *
 * The cover field reuses `CardCover` from `./catalog` so dashboard cards
 * and catalog cards stay aligned on size variants.
 */

import type { ApiEnvelope } from './api'
import type { CardCover } from './catalog'

export type EnrollmentStatus = 'active' | 'completed'

export interface EnrollmentCourseSummary {
  id: number
  slug: string
  title: string
  cover: CardCover | null
}

export interface EnrollmentStatPair {
  total: number
  completed: number
}

export interface EnrollmentQuizStats {
  total: number
  passed: number
  has_final_exam: boolean
}

/**
 * Per-course curriculum tallies computed server-side by
 * `EnrollmentStatsService`. Totals follow curriculum-stop semantics (a
 * lesson with topics counts as a lesson AND its topics), so they don't
 * arithmetically reconcile with `progress_pct` — that's expected.
 */
export interface EnrollmentStats {
  modules: EnrollmentStatPair
  lessons: EnrollmentStatPair
  topics: EnrollmentStatPair
  quizzes: EnrollmentQuizStats
}

export interface EnrollmentRecord {
  id: number
  course: EnrollmentCourseSummary
  status: EnrollmentStatus
  source: string
  progress_pct: number
  enrolled_at: string
  completed_at: string | null
  expires_at: string | null
  stats: EnrollmentStats
}

export interface EnrollmentsListData {
  items: EnrollmentRecord[]
}

export interface EnrollmentCreateRequest {
  course_id: number
}

export type EnrollmentsListResponse = ApiEnvelope<EnrollmentsListData>
export type EnrollmentRecordResponse = ApiEnvelope<EnrollmentRecord>
