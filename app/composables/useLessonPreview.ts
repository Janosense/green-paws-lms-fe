import type { ComputedRef } from 'vue'

/**
 * Phase 9.2 — instructor preview mode.
 *
 * Returns `isPreview === true` when the current route carries `?preview=1`.
 * Paired with an `edit_posts`-capable backend user, this lets instructors
 * walk through a course as if enrolled without leaving real progress trails.
 *
 * No side effects, no API calls.
 */
export function useLessonPreview(): { isPreview: ComputedRef<boolean> } {
  const route = useRoute()
  const isPreview = computed<boolean>(() => route.query.preview === '1')
  return { isPreview }
}
