/**
 * Render a course duration. Backend stores hours as a float; we render
 * "1 год 30 хв" for fractional values, "2 год" for integers, "30 хв" for
 * sub-hour. Returns "" when there is nothing to render so the caller can
 * decide whether to show the row at all.
 *
 * Unit literals come from i18n keys at the call site — this util is a pure
 * formatter that doesn't reach into vue-i18n.
 */
export function formatDuration(
  hours: number,
  units: { hours: string, minutes: string }
): string {
  if (!Number.isFinite(hours) || hours <= 0) {
    return ''
  }
  const wholeHours = Math.floor(hours)
  const remainingMinutes = Math.round((hours - wholeHours) * 60)

  if (wholeHours === 0) {
    return `${remainingMinutes} ${units.minutes}`
  }
  if (remainingMinutes === 0) {
    return `${wholeHours} ${units.hours}`
  }
  return `${wholeHours} ${units.hours} ${remainingMinutes} ${units.minutes}`
}
