import { defineStore } from 'pinia'
import type { ApiError } from '#shared/types/api'
import type { CurriculumDetailResponse, CurriculumResponse } from '#shared/types/learn'

export type ProgressLoadStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Phase 5.4a — per-course curriculum cache.
 *
 * Mirrors the single-flight pattern from `enrollments.ts`, but keyed by
 * course slug rather than per-user-globally. Hydrated lazily by lesson /
 * topic pages once the response lands and the course slug is known.
 *
 * Lesson and topic detail responses themselves stay in `useApiFetch`'s SWR
 * cache; this store only owns curriculum data because the curriculum-rail
 * (Phase 5.6) and the layout chrome share that single source of truth.
 */
export const useProgressStore = defineStore('progress', () => {
  const curricula = ref<Record<string, CurriculumResponse>>({})
  const status = ref<Record<string, ProgressLoadStatus>>({})
  const error = ref<Record<string, ApiError | null>>({})

  // Single-flight guards keyed by course slug. A second concurrent caller
  // with the same slug awaits the same in-flight promise.
  const inflight = new Map<string, Promise<void>>()

  const currentCourseSlug = ref<string | null>(null)

  const currentCourse = computed<CurriculumResponse | null>(() => {
    const slug = currentCourseSlug.value
    return slug ? curricula.value[slug] ?? null : null
  })

  function setCurrentCourse(slug: string | null): void {
    currentCourseSlug.value = slug
  }

  function clear(): void {
    curricula.value = {}
    status.value = {}
    error.value = {}
    inflight.clear()
    currentCourseSlug.value = null
  }

  async function fetchCourse(slug: string): Promise<void> {
    const api = useApi()
    status.value = { ...status.value, [slug]: 'loading' }
    try {
      const response = await api.get<CurriculumDetailResponse>(
        `/vl/v1/learn/courses/${slug}/curriculum`
      )
      curricula.value = { ...curricula.value, [slug]: response.data }
      status.value = { ...status.value, [slug]: 'success' }
      error.value = { ...error.value, [slug]: null }
    } catch (caught) {
      status.value = { ...status.value, [slug]: 'error' }
      error.value = { ...error.value, [slug]: caught as ApiError }
    }
  }

  /**
   * Idempotent load. Concurrent callers receive the same in-flight promise;
   * once cached, returns immediately. Sets `currentCourseSlug` regardless
   * of outcome so the UI can show "loading the X course" copy if needed.
   */
  function ensureCourseLoaded(slug: string): Promise<void> {
    currentCourseSlug.value = slug

    const existing = inflight.get(slug)
    if (existing) {
      return existing
    }

    if (curricula.value[slug] && status.value[slug] === 'success') {
      return Promise.resolve()
    }

    const promise = fetchCourse(slug).finally(() => {
      inflight.delete(slug)
    })
    inflight.set(slug, promise)
    return promise
  }

  /**
   * Force a re-fetch, bypassing the cache check. Used by Phase 5.6 after a
   * "Mark complete" click to refresh the rail. No 5.4a callers.
   */
  function refreshCourse(slug: string): Promise<void> {
    currentCourseSlug.value = slug

    const existing = inflight.get(slug)
    if (existing) {
      return existing
    }

    const promise = fetchCourse(slug).finally(() => {
      inflight.delete(slug)
    })
    inflight.set(slug, promise)
    return promise
  }

  return {
    // state
    curricula,
    status,
    error,
    currentCourseSlug,
    // getters
    currentCourse,
    // actions
    ensureCourseLoaded,
    refreshCourse,
    setCurrentCourse,
    clear
  }
})
