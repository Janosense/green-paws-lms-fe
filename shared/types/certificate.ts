/**
 * Phase 6.4 wire-shape contracts for `vl/v1/certificates/*`.
 *
 * Three shapes mirror the three backend responses defined in Phase 6.3
 * (`Api/CertificatesController`, `Api/CertificateVerificationController`):
 *
 * - `CertificateListItem` — row from `GET /certificates/me`.
 * - `CertificateDetail` — full payload from `GET /certificates/{uuid}`,
 *   including `download_url` and `verification_url` for action wiring.
 * - `CertificatePublicView` — privacy-minimal payload from
 *   `GET /certificates/{uuid}/public`. Excludes `course_id`, `user_id`,
 *   `enrollment_id`, and `learner_full_name` by contract.
 *
 * @author Tymofii Synianskyi
 */

import type { ApiEnvelope } from './api'

export type CertificateStatus = 'active' | 'revoked'

export interface CertificateListItem {
  uuid: string
  course_id: number
  course_title: string
  issued_at: string
  revoked_at: string | null
  status: CertificateStatus
  final_score_pct: number | null
}

export interface CertificateDetail {
  uuid: string
  course_id: number
  course_slug: string
  course_title: string
  learner_full_name: string
  instructor_names: string[]
  issuer_name: string
  issued_at: string
  revoked_at: string | null
  status: CertificateStatus
  final_score_pct: number | null
  download_url: string
  verification_url: string
}

export interface CertificatePublicView {
  uuid: string
  learner_display_name: string
  course_title: string
  issuer_name: string
  instructor_names: string[]
  issued_at: string
  status: CertificateStatus
  revoked_at: string | null
  final_score_pct: number | null
}

export interface CertificatesListData {
  items: CertificateListItem[]
}

export type CertificatesListResponse = ApiEnvelope<CertificatesListData>
export type CertificateDetailResponse = ApiEnvelope<CertificateDetail>
export type CertificatePublicResponse = ApiEnvelope<CertificatePublicView>
