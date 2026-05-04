import type { WebinarDetail } from '#shared/types/catalog'
import type { WebinarRegistrationRecord } from '#shared/types/webinar'

/**
 * Hero-CTA state for the public webinar landing page (Phase 7.5).
 *
 * Pure data — `useWebinarStateMachine` does not touch Pinia, navigation,
 * or `Date.now()` directly. The caller passes a clock seam (`now`) so the
 * state can be re-derived with `useNow({ interval: 1000 })` without
 * re-rendering the rest of the page.
 */
export type WebinarCtaState
  = | { kind: 'guest' }
    | { kind: 'paid_blocked', price: { amount: number, currency: string } }
    | { kind: 'registration_not_open_yet', opensAt: string }
    | { kind: 'registration_closed' }
    | { kind: 'capacity_reached' }
    | { kind: 'register_ready' }
    | { kind: 'registered_pending', scheduledStart: string }
    | { kind: 'registered_join_window', slug: string }
    | { kind: 'registered_past_recording_available', slug: string }
    | { kind: 'registered_past_no_recording' }
    | { kind: 'registered_past_window_expired' }
    | { kind: 'cancelled_registration_can_re_register' }
    | { kind: 'session_cancelled' }

export interface WebinarStateMachineInput {
  webinar: WebinarDetail
  registration: WebinarRegistrationRecord | null
  isAuthenticated: boolean
  now: Date
  /** True when a register attempt previously failed with `capacity_reached`. */
  capacityReached?: boolean
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isRegistrationWindowOpen(webinar: WebinarDetail, now: Date): boolean {
  const opens = parseDate(webinar.registration_opens_at)
  const closes = parseDate(webinar.registration_closes_at)
  if (opens && now < opens) {
    return false
  }
  if (closes && now >= closes) {
    return false
  }
  return true
}

export function useWebinarStateMachine(input: WebinarStateMachineInput): WebinarCtaState {
  const { webinar, registration, isAuthenticated, now } = input

  if (webinar.status === 'cancelled') {
    return { kind: 'session_cancelled' }
  }

  if (!isAuthenticated) {
    return { kind: 'guest' }
  }

  const hasActive = registration?.status === 'active'

  if (webinar.price > 0 && !hasActive) {
    return {
      kind: 'paid_blocked',
      price: { amount: webinar.price, currency: webinar.currency }
    }
  }

  if (registration && registration.status === 'active') {
    if (!registration.computed.is_past) {
      if (registration.computed.join_window_open) {
        return { kind: 'registered_join_window', slug: webinar.slug }
      }
      return {
        kind: 'registered_pending',
        scheduledStart: registration.webinar.scheduled_start ?? webinar.scheduled_start ?? ''
      }
    }
    // Past:
    if (registration.computed.recording_available) {
      return { kind: 'registered_past_recording_available', slug: webinar.slug }
    }
    if (registration.webinar.recording_access_days === 0) {
      return { kind: 'registered_past_no_recording' }
    }
    return { kind: 'registered_past_window_expired' }
  }

  if (registration && registration.status === 'cancelled') {
    if (isRegistrationWindowOpen(webinar, now)) {
      return { kind: 'cancelled_registration_can_re_register' }
    }
    // Otherwise fall through to closed/not-open below.
  }

  const opens = parseDate(webinar.registration_opens_at)
  if (opens && now < opens) {
    return { kind: 'registration_not_open_yet', opensAt: webinar.registration_opens_at as string }
  }

  const closes = parseDate(webinar.registration_closes_at)
  if (closes && now >= closes) {
    return { kind: 'registration_closed' }
  }

  if (input.capacityReached) {
    return { kind: 'capacity_reached' }
  }

  return { kind: 'register_ready' }
}
