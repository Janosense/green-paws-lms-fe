import type { WebinarStatus } from '#shared/types/catalog'
import { formatInSourceOffset } from '~/utils/formatInSourceOffset'

/**
 * Render a webinar's scheduled date for the catalog card.
 *
 * - `completed` → "Завершено 15 квітня"
 * - everything else → "20 травня, 18:00"
 * - `null` ISO → "" (caller decides whether to render the row)
 *
 * The "Завершено " prefix is provided by the caller via i18n so this util
 * stays free of user-facing Ukrainian literals.
 *
 * Formatting is pinned to the timestamp's own UTC offset via
 * {@link formatInSourceOffset} — `/webinars` and `/search` are SSR-rendered,
 * and a host-relative format there renders one time on Vercel (`TZ=UTC`) and
 * another in the browser, which trips Vue's hydration check.
 */
const LOCALE = 'uk-UA'

const DAY_MONTH: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long'
}

const TIME: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
}

export function formatScheduledDate(
  iso: string | null,
  status: WebinarStatus,
  labels: { completedPrefix: string }
): string {
  if (!iso) {
    return ''
  }

  const dayMonth = formatInSourceOffset(iso, LOCALE, DAY_MONTH)
  if (dayMonth === null) {
    return ''
  }

  if (status === 'completed') {
    return `${labels.completedPrefix} ${dayMonth}`
  }

  const time = formatInSourceOffset(iso, LOCALE, TIME)
  return time === null ? dayMonth : `${dayMonth}, ${time}`
}
