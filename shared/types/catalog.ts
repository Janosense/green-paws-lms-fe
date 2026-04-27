import type { ApiEnvelope } from './api'

/**
 * Subset of cover sizes the catalog cards rely on. The backend may emit any
 * of these keys (see `CoverImageTransformer::SIZE_MAP`); a missing key means
 * WP didn't generate that size for the underlying attachment.
 */
export interface CardCover {
  thumbnail?: { url: string, width: number, height: number }
  card?: { url: string, width: number, height: number }
  hero?: { url: string, width: number, height: number }
  full?: { url: string, width: number, height: number }
}

export interface CardInstructor {
  id: number
  display_name: string
  avatar: { url: string, size: number }
}

/**
 * Term as embedded in a catalog card. The backend also includes `id` and
 * `count`, but the cards never need them — so the type stays narrow.
 */
export interface CardTerm {
  slug: string
  name: string
  parent_slug?: string | null
}

export interface CourseCardItem {
  id: number
  slug: string
  title: string
  excerpt: string
  type: 'self_paced' | 'cohort'
  duration_hours: number
  price: number
  currency: string
  enrollment_open: boolean
  difficulty: CardTerm | null
  categories: CardTerm[]
  specialties: CardTerm[]
  tags: CardTerm[]
  cover: CardCover | null
  lead_instructor: CardInstructor | null
  permalink: string
}

export type WebinarStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'

export interface WebinarCardItem extends Omit<CourseCardItem, 'type' | 'duration_hours' | 'enrollment_open'> {
  scheduled_start: string | null
  scheduled_end: string | null
  status: WebinarStatus
  registration_open: boolean
}

export interface CatalogPagination {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface CatalogListData<TItem> {
  items: TItem[]
  pagination: CatalogPagination
}

export type CourseListResponse = ApiEnvelope<CatalogListData<CourseCardItem>>
export type WebinarListResponse = ApiEnvelope<CatalogListData<WebinarCardItem>>

export interface TaxonomyTerm {
  id: number
  slug: string
  name: string
  parent_slug?: string | null
  count: number
}

export type TaxonomyResponse = ApiEnvelope<{ items: TaxonomyTerm[] }>

/**
 * Internal, normalized shape parsed from `useRoute().query`. The URL is the
 * single source of truth — this type is only a convenience for components
 * downstream of `CatalogShell`.
 */
export interface CatalogQueryState {
  q: string
  categories: string[]
  specialties: string[]
  difficulty: string[]
  tags: string[]
  sort: CatalogSort
  page: number
}

export type CatalogSort
  = | 'newest'
    | 'oldest'
    | 'title-asc'
    | 'title-desc'
    | 'upcoming'

export type CatalogType = 'courses' | 'webinars'
