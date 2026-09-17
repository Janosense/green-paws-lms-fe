/** One course's totals from `GET /vl/v1/study-time/me` (a bare object, no envelope). */
interface StudyTimeCourseSummary {
  course_id: number
  course_slug: string
  total_seconds: number
  video_seconds: number
  reading_seconds: number
  quiz_seconds: number
  session_seconds: number
}

interface StudyTimeSummaryResponse {
  courses: StudyTimeCourseSummary[]
}

/**
 * The learner's own study time, per course, for the dashboard cards.
 *
 * One read per dashboard load, keyed by course id so a card can look itself
 * up without anything being added to `EnrollmentRecord` or to `core`'s
 * enrollments store (`frontend/CLAUDE.md` — this feature never writes a
 * `core` store).
 *
 * Deliberately forgiving: study time is an extra line on a card, never the
 * reason a dashboard fails to render. A failed read resolves to an empty
 * map, logged in dev only, and `authRedirect: false` keeps a stale session
 * discovered by this background call from yanking the learner to /login —
 * the enrollments store's own boot read does the same.
 */
export function useStudyTimeSummary() {
  const api = useApi()
  const secondsByCourse = ref<Record<number, number>>({})

  async function load(): Promise<void> {
    try {
      const response = await api.get<StudyTimeSummaryResponse>(
        '/vl/v1/study-time/me',
        { authRedirect: false }
      )
      const next: Record<number, number> = {}
      for (const course of response?.courses ?? []) {
        next[course.course_id] = course.total_seconds
      }
      secondsByCourse.value = next
    } catch (e) {
      secondsByCourse.value = {}
      if (import.meta.dev) {
        console.warn('[study-time] summary unavailable', e)
      }
    }
  }

  return { secondsByCourse, load }
}
