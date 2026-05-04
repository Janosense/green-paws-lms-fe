/**
 * Phase 7.5 wire-shape contracts for `vl/v1/webinars/me` (GET) and
 * `vl/v1/webinars/{slug}/registrations` (POST + DELETE).
 *
 * Mirrors the output of `WebinarRegistrationTransformer` 1:1 — the
 * frontend never reshapes; `computed.*` is the gate that drives the
 * hero-CTA state machine.
 *
 * Unlike the enrollments controller, the webinar registrations
 * controller does not use the `{success, data}` envelope — it returns
 * a flat object with the payload at the top level. So these types
 * describe the full response, not an inner `data` field.
 */

import type { CardCover } from './catalog'

export type WebinarRegistrationStatus = 'active' | 'cancelled'

export type WebinarRegistrationSource
  = | 'self_signup'
    | 'manual'
    | 'purchase'
    | 'gift'
    | 'grant'

export type WebinarLifecycleStatus
  = | 'scheduled'
    | 'live'
    | 'completed'
    | 'cancelled'

export interface WebinarRegistrationWebinar {
  id: number
  slug: string
  title: string
  scheduled_start: string | null
  scheduled_end: string | null
  registration_opens_at: string | null
  registration_closes_at: string | null
  price: { amount: number, currency: string }
  capacity: number
  cover: CardCover | null
  status: WebinarLifecycleStatus
  recording_access_days: number
  recording_available_until: string | null
}

export interface WebinarRegistrationComputed {
  join_window_open: boolean
  join_opens_at: string | null
  join_closes_at: string | null
  recording_available: boolean
  is_past: boolean
}

export interface WebinarRegistrationRecord {
  id: number
  status: WebinarRegistrationStatus
  source: WebinarRegistrationSource
  registered_at: string
  cancelled_at: string | null
  attended: boolean
  attended_duration_seconds: number
  webinar: WebinarRegistrationWebinar
  computed: WebinarRegistrationComputed
}

export interface WebinarRegistrationsListResponse {
  success: true
  registrations: WebinarRegistrationRecord[]
}

export interface WebinarRegistrationMutationResponse {
  success: true
  registration: WebinarRegistrationRecord
  idempotent?: boolean
}

export type WebinarRegistrationCreateResponse = WebinarRegistrationMutationResponse
export type WebinarRegistrationCancelResponse = WebinarRegistrationMutationResponse
