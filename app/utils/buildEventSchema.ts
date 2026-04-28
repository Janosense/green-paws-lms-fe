import type { WebinarDetail, WebinarStatus } from '#shared/types/catalog'

const ORGANIZER_NAME = 'Green Paws LMS'
const DESCRIPTION_LIMIT = 280

function pickCoverUrl(cover: WebinarDetail['cover']): string | null {
  if (!cover) {
    return null
  }
  return cover.hero?.url ?? cover.full?.url ?? null
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) {
    return text
  }
  return `${text.slice(0, limit - 1).trimEnd()}…`
}

function buildDescription(webinar: WebinarDetail): string {
  const source = webinar.excerpt && webinar.excerpt.trim().length > 0
    ? webinar.excerpt
    : stripHtml(webinar.content || '')
  return truncate(source.trim(), DESCRIPTION_LIMIT)
}

function eventStatus(status: WebinarStatus): string {
  // Schema.org has no "live" status; "scheduled" stays in effect during
  // the event itself. "completed" is also represented as "scheduled" —
  // there is no Schema.org status for past events that ran as planned.
  switch (status) {
    case 'cancelled':
      return 'https://schema.org/EventCancelled'
    case 'scheduled':
    case 'live':
    case 'completed':
    default:
      return 'https://schema.org/EventScheduled'
  }
}

function formatPriceDecimal(price: number): string {
  return price.toFixed(2)
}

/**
 * Build a Schema.org `Event` JSON-LD object from a `WebinarDetail`.
 *
 * Pure function — accepts the detail and an absolute site URL, returns a
 * plain object ready to feed into `useStructuredData`.
 */
export function buildEventSchema(webinar: WebinarDetail, siteUrl: string): Record<string, unknown> {
  const description = buildDescription(webinar)
  const image = pickCoverUrl(webinar.cover)
  const canonical = `${siteUrl}${webinar.seo.canonical_path}`

  const offers: Record<string, unknown> = {
    '@type': 'Offer',
    'price': formatPriceDecimal(webinar.price),
    'priceCurrency': webinar.currency,
    'availability': webinar.registration_open
      ? 'https://schema.org/InStock'
      : 'https://schema.org/SoldOut',
    'url': canonical
  }

  if (webinar.registration_opens_at) {
    offers.validFrom = webinar.registration_opens_at
  }

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    'name': webinar.title,
    'description': description,
    'startDate': webinar.scheduled_start,
    'eventAttendanceMode': 'https://schema.org/OnlineEventAttendanceMode',
    'eventStatus': eventStatus(webinar.status),
    'location': {
      '@type': 'VirtualLocation',
      'url': canonical
    },
    'organizer': {
      '@type': 'Organization',
      'name': ORGANIZER_NAME,
      'url': siteUrl
    },
    'offers': offers
  }

  if (webinar.scheduled_end) {
    schema.endDate = webinar.scheduled_end
  }

  if (image) {
    schema.image = image
  }

  if (webinar.instructors.length > 0) {
    schema.performer = webinar.instructors.map(instructor => ({
      '@type': 'Person',
      'name': instructor.display_name,
      'image': instructor.avatar.url
    }))
  }

  return schema
}
