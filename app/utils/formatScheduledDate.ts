import type { WebinarStatus } from '#shared/types/catalog'

/**
 * Render a webinar's scheduled date for the catalog card.
 *
 * - `completed` → "Завершено 15 квітня"
 * - everything else → "20 травня, 18:00"
 * - `null` ISO → "" (caller decides whether to render the row)
 *
 * The "Завершено " prefix is provided by the caller via i18n so this util
 * stays free of user-facing Ukrainian literals.
 */
export function formatScheduledDate(
  iso: string | null,
  status: WebinarStatus,
  labels: { completedPrefix: string }
): string {
  if (!iso) {
    return ''
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  if (status === 'completed') {
    return `${labels.completedPrefix} ${formatDayMonth(date)}`
  }
  return `${formatDayMonth(date)}, ${formatTime(date)}`
}

function formatDayMonth(date: Date): string {
  try {
    return new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'long'
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function formatTime(date: Date): string {
  try {
    return new Intl.DateTimeFormat('uk-UA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
  } catch {
    return date.toISOString().slice(11, 16)
  }
}
