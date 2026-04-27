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

/* ------------------------------------------------------------------------ *
 * Detail-level types — Phase 3.4. Detail responses extend card shapes with
 * full content, instructors with bios, schedule fields, curriculum, and an
 * SEO block driven server-side from the post excerpt + cover.
 * ------------------------------------------------------------------------ */

export interface DetailInstructor {
  id: number
  display_name: string
  role_in_course: 'lead' | 'co_instructor'
  avatar: { url: string, size: number }
  bio: string
}

export interface DetailMaterial {
  url: string
  name: string
  size: number
}

export interface CurriculumLesson {
  id: number
  title: string
  duration_seconds: number
  is_preview: boolean
}

export interface CurriculumModule {
  id: number
  title: string
  duration_minutes: number
  passing_threshold: number | null
  intro_video_url: string
  lessons: CurriculumLesson[]
}

export interface Curriculum {
  modules: CurriculumModule[]
  orphan_lessons: CurriculumLesson[]
}

export interface SeoBlock {
  title: string
  description: string
  og_image: string | null
  canonical_path: string
}

export interface CourseDetail {
  id: number
  slug: string
  title: string
  excerpt: string
  content: string
  type: 'self_paced' | 'cohort'
  duration_hours: number
  price: number
  currency: string
  enrollment_open: boolean
  enrollment_opens_at: string | null
  enrollment_closes_at: string | null
  starts_at: string | null
  ends_at: string | null
  max_students: number
  preview_video_url: string
  certificate_enabled: boolean
  passing_threshold: number | null
  difficulty: CardTerm | null
  categories: CardTerm[]
  specialties: CardTerm[]
  tags: CardTerm[]
  cover: CardCover | null
  instructors: DetailInstructor[]
  curriculum: Curriculum
  seo: SeoBlock
}

export interface WebinarDetail {
  id: number
  slug: string
  title: string
  excerpt: string
  content: string
  scheduled_start: string | null
  scheduled_end: string | null
  status: WebinarStatus
  price: number
  currency: string
  max_attendees: number
  registration_opens_at: string | null
  registration_closes_at: string | null
  registration_open: boolean
  preview_video_url: string
  recording_offered: boolean
  recording_access_days: number
  materials: DetailMaterial[]
  difficulty: CardTerm | null
  categories: CardTerm[]
  specialties: CardTerm[]
  tags: CardTerm[]
  cover: CardCover | null
  instructors: DetailInstructor[]
  seo: SeoBlock
}

export type CourseDetailResponse = ApiEnvelope<CourseDetail>
export type WebinarDetailResponse = ApiEnvelope<WebinarDetail>
