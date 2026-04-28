import type {
  CatalogPagination,
  CourseListResponse,
  WebinarListResponse
} from '#shared/types/catalog'

interface SitemapUrl {
  loc: string
  changefreq?: 'daily' | 'weekly' | 'monthly'
  priority?: string
}

const PER_PAGE = 50
// Safety net so a misbehaving backend can't make the sitemap chase
// pagination forever. Scaling beyond this requires a dedicated
// `slugs-only` backend endpoint.
const MAX_PAGES_PER_TYPE = 20

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

async function fetchAllSlugs(
  apiBase: string,
  type: 'courses' | 'webinars'
): Promise<string[]> {
  const slugs: string[] = []

  for (let page = 1; page <= MAX_PAGES_PER_TYPE; page++) {
    const url = `${apiBase}/vl/v1/catalog/${type}?per_page=${PER_PAGE}&page=${page}`
    let response: CourseListResponse | WebinarListResponse
    try {
      response = await $fetch<CourseListResponse | WebinarListResponse>(url)
    } catch {
      break
    }
    if (!response?.success) {
      break
    }

    const items = response.data.items
    for (const item of items) {
      if (item?.slug) {
        slugs.push(item.slug)
      }
    }

    const pagination: CatalogPagination = response.data.pagination
    if (page >= pagination.total_pages || items.length === 0) {
      break
    }
  }

  return slugs
}

function renderUrl(entry: SitemapUrl): string {
  const parts = [`    <loc>${escapeXml(entry.loc)}</loc>`]
  if (entry.changefreq) {
    parts.push(`    <changefreq>${entry.changefreq}</changefreq>`)
  }
  if (entry.priority) {
    parts.push(`    <priority>${entry.priority}</priority>`)
  }
  return `  <url>\n${parts.join('\n')}\n  </url>`
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const siteUrl = trimTrailingSlash(config.public.siteUrl ?? '')
  const apiBase = trimTrailingSlash(config.public.wpApiBase ?? '')

  const entries: SitemapUrl[] = [
    { loc: `${siteUrl}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${siteUrl}/courses`, changefreq: 'daily', priority: '0.9' },
    { loc: `${siteUrl}/webinars`, changefreq: 'daily', priority: '0.9' }
  ]

  if (apiBase) {
    const [courseSlugs, webinarSlugs] = await Promise.all([
      fetchAllSlugs(apiBase, 'courses'),
      fetchAllSlugs(apiBase, 'webinars')
    ])

    for (const slug of courseSlugs) {
      entries.push({
        loc: `${siteUrl}/courses/${slug}`,
        changefreq: 'weekly',
        priority: '0.8'
      })
    }
    for (const slug of webinarSlugs) {
      entries.push({
        loc: `${siteUrl}/webinars/${slug}`,
        changefreq: 'weekly',
        priority: '0.8'
      })
    }
  }

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries.map(renderUrl).join('\n'),
    '</urlset>'
  ].join('\n')

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=300')

  return body
})
