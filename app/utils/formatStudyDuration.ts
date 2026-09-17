/**
 * Render a study-time total. The backend counts seconds, so this is the
 * seconds-side sibling of `formatDuration.ts` — that one takes fractional
 * *hours* (`duration_hours` from the catalog payloads) and is used by seven
 * call sites; the two must not be conflated.
 *
 * Mirrors `StudyTime\Support\DurationFormatter::uk()` on the backend:
 * "12 год 05 хв" with the minutes zero-padded once hours appear, "45 хв"
 * under an hour, "< 1 хв" for anything that would otherwise round away.
 * Minutes are the smallest unit the reader gets — one heartbeat is worth up
 * to `cap_seconds`, so a seconds figure would claim a precision the
 * measurement does not have.
 *
 * Returns "" for zero, like its sibling, so the caller decides whether to
 * render the line at all. (The PHP formatter answers "0 хв" there instead:
 * it fills table cells, which must hold something, while this one gates a
 * whole sentence.)
 *
 * Unit literals come from i18n at the call site — this util is a pure
 * formatter that never reaches into vue-i18n.
 */
export function formatStudyDuration(
  seconds: number,
  units: { hours: string, minutes: string }
): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return ''
  }
  if (seconds < 60) {
    return `< 1 ${units.minutes}`
  }

  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes} ${units.minutes}`
  }
  return `${hours} ${units.hours} ${String(minutes).padStart(2, '0')} ${units.minutes}`
}
