import type { CourseDetail } from '#shared/types/catalog'

const PROVIDER_NAME = 'Green Paws LMS'
const DESCRIPTION_LIMIT = 280

function pickCoverUrl(cover: CourseDetail['cover']): string | null {
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

function buildDescription(course: CourseDetail): string {
  const source = course.excerpt && course.excerpt.trim().length > 0
    ? course.excerpt
    : stripHtml(course.content || '')
  return truncate(source.trim(), DESCRIPTION_LIMIT)
}

function formatPriceDecimal(price: number): string {
  return price.toFixed(2)
}

/**
 * Build a Schema.org `Course` JSON-LD object from a `CourseDetail`.
 *
 * Pure function — accepts the detail and an absolute site URL, returns a
 * plain object ready to feed into `useStructuredData`.
 */
export function buildCourseSchema(course: CourseDetail, siteUrl: string): Record<string, unknown> {
  const description = buildDescription(course)
  const image = pickCoverUrl(course.cover)
  const canonical = `${siteUrl}${course.seo.canonical_path}`

  const offers: Record<string, unknown> = {
    '@type': 'Offer',
    'price': formatPriceDecimal(course.price),
    'priceCurrency': course.currency,
    'availability': course.enrollment_open
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    'url': canonical
  }

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    'name': course.title,
    'description': description,
    'url': canonical,
    'provider': {
      '@type': 'Organization',
      'name': PROVIDER_NAME,
      'url': siteUrl
    },
    'offers': offers
  }

  if (image) {
    schema.image = image
  }

  if (course.instructors.length > 0) {
    schema.instructor = course.instructors.map(instructor => ({
      '@type': 'Person',
      'name': instructor.display_name,
      'image': instructor.avatar.url
    }))
  }

  if (course.type === 'cohort' && course.starts_at) {
    const instance: Record<string, unknown> = {
      '@type': 'CourseInstance',
      'courseMode': 'online',
      'startDate': course.starts_at
    }
    if (course.ends_at) {
      instance.endDate = course.ends_at
    }
    schema.hasCourseInstance = instance
  }

  return schema
}
