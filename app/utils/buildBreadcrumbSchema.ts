import type { CardTerm, CatalogType } from '#shared/types/catalog'

interface BreadcrumbInput {
  type: CatalogType
  title: string
  canonicalPath: string
  category: CardTerm | null
}

const HOME_LABEL = 'Головна'
const LISTING_LABEL: Record<CatalogType, string> = {
  courses: 'Курси',
  webinars: 'Вебінари'
}

/**
 * Build a Schema.org `BreadcrumbList` JSON-LD for a course or webinar
 * landing. Mirrors the visual breadcrumb component (CatalogBreadcrumbs)
 * in both order and category-picking semantics: position 3 is included
 * only when the detail has a category, and uses the first category from
 * the array.
 *
 * Labels are baked in (Ukrainian) on purpose — JSON-LD breadcrumb names
 * are content, not interface chrome, so they should match what users see
 * on the page. When English support lands, this builder will need a
 * locale parameter.
 */
export function buildBreadcrumbSchema(input: BreadcrumbInput, siteUrl: string): Record<string, unknown> {
  const items: Array<Record<string, unknown>> = []
  let position = 1

  items.push({
    '@type': 'ListItem',
    'position': position++,
    'name': HOME_LABEL,
    'item': siteUrl
  })

  items.push({
    '@type': 'ListItem',
    'position': position++,
    'name': LISTING_LABEL[input.type],
    'item': `${siteUrl}/${input.type}`
  })

  if (input.category) {
    items.push({
      '@type': 'ListItem',
      'position': position++,
      'name': input.category.name,
      'item': `${siteUrl}/${input.type}?categories=${input.category.slug}`
    })
  }

  items.push({
    '@type': 'ListItem',
    'position': position++,
    'name': input.title,
    'item': `${siteUrl}${input.canonicalPath}`
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items
  }
}
