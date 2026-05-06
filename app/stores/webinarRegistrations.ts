import { defineStore } from 'pinia'
import type { ApiError } from '#shared/types/api'
import type {
  WebinarRegistrationCancelResponse,
  WebinarRegistrationCreateResponse,
  WebinarRegistrationRecord,
  WebinarRegistrationsListResponse
} from '#shared/types/webinar'

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Webinar registrations store — Phase 7.5. Mirrors the `enrollments` store
 * line-by-line: module-level single-flight `init()`, boot-time hydration via
 * `app/plugins/webinar-registrations.ts`, and an auth-state watcher that
 * refreshes on login and clears on logout.
 *
 * The list endpoint is queried with `status=active&time_filter=all` so the
 * dashboard surfaces both upcoming and past registrations from a single
 * boot-time call. Cancelled rows arrive only via per-call mutations.
 */
export const useWebinarRegistrationsStore = defineStore('webinar-registrations', () => {
  const items = ref<WebinarRegistrationRecord[]>([])
  const status = ref<FetchStatus>('idle')
  const error = ref<ApiError | null>(null)
  const initialized = ref(false)

  const initInflight = ref<Promise<void> | null>(null)

  const activeRegistrations = computed(() =>
    items.value.filter(item => item.status === 'active' && !item.computed.is_past)
  )
  const pastRegistrations = computed(() =>
    items.value.filter(item => item.status === 'active' && item.computed.is_past)
  )
  const cancelledRegistrations = computed(() =>
    items.value.filter(item => item.status === 'cancelled')
  )

  function hasActiveRegistration(slug: string): boolean {
    return items.value.some(item => item.webinar.slug === slug && item.status === 'active')
  }

  function getRegistration(slug: string): WebinarRegistrationRecord | null {
    return items.value.find(item => item.webinar.slug === slug) ?? null
  }

  function clear(): void {
    items.value = []
    status.value = 'idle'
    error.value = null
    initialized.value = false
    initInflight.value = null
  }

  async function refresh(): Promise<void> {
    const api = useApi()
    status.value = 'loading'
    try {
      const response = await api.get<WebinarRegistrationsListResponse>(
        '/vl/v1/webinars/me?status=active&time_filter=all'
      )
      items.value = Array.isArray(response?.registrations) ? response.registrations : []
      status.value = 'success'
      error.value = null
    } catch (caught) {
      status.value = 'error'
      error.value = caught as ApiError
    } finally {
      initialized.value = true
    }
  }

  function init(): Promise<void> {
    if (initialized.value) {
      return Promise.resolve()
    }
    if (initInflight.value) {
      return initInflight.value
    }
    const promise = refresh().finally(() => {
      initInflight.value = null
    })
    initInflight.value = promise
    return promise
  }

  function upsertItem(record: WebinarRegistrationRecord): void {
    const index = items.value.findIndex(item => item.webinar.slug === record.webinar.slug)
    if (index >= 0) {
      items.value.splice(index, 1, record)
    } else {
      items.value = [record, ...items.value]
    }
  }

  /**
   * Self-register for a webinar by slug. Resolves with the persisted record;
   * throws the normalized `ApiError` so the caller can map the code to a
   * localized toast (see `resolveWebinarError`).
   */
  async function register(slug: string): Promise<WebinarRegistrationRecord> {
    const api = useApi()
    const response = await api.post<WebinarRegistrationCreateResponse>(
      `/vl/v1/webinars/${slug}/registrations`
    )
    upsertItem(response.registration)
    return response.registration
  }

  /**
   * Cancel an active registration. The backend returns the updated record
   * (status=cancelled); we replace the local row rather than re-fetch.
   */
  async function cancel(slug: string): Promise<WebinarRegistrationRecord> {
    const api = useApi()
    const response = await api.delete<WebinarRegistrationCancelResponse>(
      `/vl/v1/webinars/${slug}/registrations`
    )
    upsertItem(response.registration)
    return response.registration
  }

  return {
    // state
    items,
    status,
    error,
    initialized,
    // getters
    activeRegistrations,
    pastRegistrations,
    cancelledRegistrations,
    // utilities
    hasActiveRegistration,
    getRegistration,
    // actions
    init,
    refresh,
    register,
    cancel,
    clear
  }
})
