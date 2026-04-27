/**
 * Static relative-date label. Used for the secondary line under a webinar's
 * scheduled date — no live countdown, just a coarse "Сьогодні / Завтра /
 * Через N днів" hint. The 5-minute SWR cache absorbs the small drift
 * between SSR and client hydration.
 *
 * Returns "" outside the ±7-day window so the absolute date carries the
 * message alone.
 *
 * Labels come from i18n at the call site — this util doesn't reach into
 * vue-i18n. The `now` parameter is required for SSR determinism.
 */
export interface RelativeDateLabels {
  today: string
  tomorrow: string
  daysFuture: (days: number) => string
  daysPast: (days: number) => string
}

export function formatRelativeDate(
  iso: string | null,
  now: Date,
  labels: RelativeDateLabels
): string {
  if (!iso) {
    return ''
  }
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) {
    return ''
  }

  const dayMs = 24 * 60 * 60 * 1000
  const startOfNow = startOfDay(now).getTime()
  const startOfTarget = startOfDay(target).getTime()
  const diffDays = Math.round((startOfTarget - startOfNow) / dayMs)

  if (diffDays === 0) {
    return labels.today
  }
  if (diffDays === 1) {
    return labels.tomorrow
  }
  if (diffDays > 1 && diffDays <= 7) {
    return labels.daysFuture(diffDays)
  }
  if (diffDays < 0 && diffDays >= -7) {
    return labels.daysPast(Math.abs(diffDays))
  }
  return ''
}

function startOfDay(date: Date): Date {
  const out = new Date(date)
  out.setHours(0, 0, 0, 0)
  return out
}
