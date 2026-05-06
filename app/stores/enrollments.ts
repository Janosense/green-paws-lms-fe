import { defineStore } from 'pinia'
import type { ApiError } from '#shared/types/api'
import type {
  EnrollmentRecord,
  EnrollmentRecordResponse,
  EnrollmentsListResponse
} from '#shared/types/enrollments'

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Enrollments store. Hydrated on boot for authed users by
 * `app/plugins/enrollments.ts`; the catalog landing CTA uses it to flip
 * "Записатися" → "Продовжити" once the user has an active record.
 *
 * Imperative-only: every call goes through `useApi()`. Mirrors the
 * single-flight pattern from the auth store's `refresh()`.
 */
export const useEnrollmentsStore = defineStore('enrollments', () => {
  const items = ref<EnrollmentRecord[]>([])
  const status = ref<FetchStatus>('idle')
  const error = ref<ApiError | null>(null)
  const initialized = ref(false)

  // Single-flight guard: a flurry of `init()` callers (boot plugin + page +
  // landing CTA) all await the same in-flight refresh promise.
  const initInflight = ref<Promise<void> | null>(null)

  const activeEnrollments = computed(() =>
    items.value.filter(item => item.status === 'active')
  )
  const completedEnrollments = computed(() =>
    items.value.filter(item => item.status === 'completed')
  )

  function hasActiveEnrollment(courseId: number): boolean {
    return items.value.some(item => item.course.id === courseId && item.status === 'active')
  }

  function getEnrollment(courseId: number): EnrollmentRecord | null {
    return items.value.find(item => item.course.id === courseId) ?? null
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
      const response = await api.get<EnrollmentsListResponse>('/vl/v1/enrollments/me')
      items.value = Array.isArray(response?.data?.items) ? response.data.items : []
      status.value = 'success'
      error.value = null
    } catch (caught) {
      status.value = 'error'
      error.value = caught as ApiError
    } finally {
      initialized.value = true
    }
  }

  /**
   * Idempotent first-load. Concurrent callers receive the same in-flight
   * promise; once initialized, returns a resolved promise without firing
   * a second request. Use `refresh()` directly to force a re-fetch.
   */
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

  /**
   * Enroll in a course. Resolves with the persisted record (the same shape
   * as a list item); throws the normalized `ApiError` on failure so the
   * caller can map it to a localized toast.
   *
   * Does not touch the store-level `status` / `error` fields — those track
   * the GET-list lifecycle, not per-action mutations. Successful records
   * are merged into `items` (replace by id, else prepend) so the dashboard
   * reflects the new enrollment without a refetch.
   */
  async function enroll(courseId: number): Promise<EnrollmentRecord> {
    const api = useApi()
    const response = await api.post<EnrollmentRecordResponse>(
      '/vl/v1/enrollments',
      { course_id: courseId }
    )
    const record = response.data
    const existingIndex = items.value.findIndex(item => item.id === record.id)
    if (existingIndex >= 0) {
      items.value.splice(existingIndex, 1, record)
    } else {
      items.value = [record, ...items.value]
    }
    return record
  }

  return {
    // state
    items,
    status,
    error,
    initialized,
    // getters
    activeEnrollments,
    completedEnrollments,
    // utilities
    hasActiveEnrollment,
    getEnrollment,
    // actions
    init,
    refresh,
    enroll,
    clear
  }
})
