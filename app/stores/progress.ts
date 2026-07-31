import { defineStore } from 'pinia'
import type { ApiError } from '#shared/types/api'
import type {
  CurriculumDetailResponse,
  CurriculumLessonNode,
  CurriculumResponse,
  CurriculumTopicNode,
  ProgressStatus
} from '#shared/types/learn'

type LeafEntityType = 'lesson' | 'topic'

function statusRank(status: ProgressStatus): number {
  return status === 'completed' ? 2 : status === 'in_progress' ? 1 : 0
}

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
   * Optimistically advance the progress.status of a single lesson or topic
   * in the cached curriculum so the rail icon flips immediately, before the
   * authoritative refresh lands. No-op if the curriculum isn't cached yet,
   * if the entity isn't found, or if the new status would be a downgrade
   * (e.g. an in_progress view_start arriving after a completion).
   */
  function applyEntityStatus(
    courseSlug: string,
    entityType: LeafEntityType,
    entityId: number,
    nextStatus: ProgressStatus
  ): void {
    const curriculum = curricula.value[courseSlug]
    if (!curriculum) return

    const updateLeaf = (leaf: CurriculumLessonNode | CurriculumTopicNode): boolean => {
      if (statusRank(nextStatus) <= statusRank(leaf.progress.status)) return false
      leaf.progress = {
        ...leaf.progress,
        status: nextStatus,
        completed_at: nextStatus === 'completed'
          ? leaf.progress.completed_at ?? new Date().toISOString()
          : leaf.progress.completed_at
      }
      return true
    }

    let mutated = false
    const visit = (lesson: CurriculumLessonNode): void => {
      if (entityType === 'lesson' && lesson.id === entityId) {
        if (updateLeaf(lesson)) mutated = true
      }
      if (entityType === 'topic') {
        for (const topic of lesson.topics) {
          if (topic.id === entityId && updateLeaf(topic)) {
            mutated = true
            break
          }
        }
      }
    }

    for (const module of curriculum.modules) {
      for (const lesson of module.lessons) visit(lesson)
    }
    for (const lesson of curriculum.orphan_lessons) visit(lesson)

    if (mutated) {
      curricula.value = { ...curricula.value, [courseSlug]: { ...curriculum } }
    }
  }

  /**
   * Drop one course's cached curriculum without refetching. Used after a
   * progress reset: the cache is stale (locks re-engaged, statuses back to
   * not_started), but the student may never open the course next, so an
   * eager refetch would be a wasted authed request — `ensureCourseLoaded`
   * refetches lazily on the next visit.
   */
  function removeCourse(slug: string): void {
    curricula.value = filteredOut(curricula.value, slug)
    status.value = filteredOut(status.value, slug)
    error.value = filteredOut(error.value, slug)
    inflight.delete(slug)
  }

  function filteredOut<T>(record: Record<string, T>, key: string): Record<string, T> {
    if (!(key in record)) {
      return record
    }
    const next: Record<string, T> = {}
    for (const k in record) {
      if (k !== key) {
        next[k] = record[k] as T
      }
    }
    return next
  }

  /**
   * Force a re-fetch, bypassing the cache check. Used after view_start /
   * mark-complete events to reconcile rail icons and progress_pct against
   * the authoritative server state.
   *
   * A refresh must resolve against a GET issued *after* the caller's
   * write, so a concurrent in-flight load is chained behind, not joined:
   * joining would hand back a pre-write snapshot, which on a sequential
   * course leaves the next lesson padlocked until navigation. Later
   * `ensureCourseLoaded` callers still dedupe against the chained
   * promise.
   */
  function refreshCourse(slug: string): Promise<void> {
    currentCourseSlug.value = slug

    const existing = inflight.get(slug) ?? Promise.resolve()
    const promise = existing
      .catch(() => {})
      .then(() => fetchCourse(slug))
      .finally(() => {
        if (inflight.get(slug) === promise) {
          inflight.delete(slug)
        }
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
    removeCourse,
    applyEntityStatus,
    setCurrentCourse,
    clear
  }
})
