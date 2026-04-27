import type {
  CatalogQueryState,
  CatalogSort,
  CatalogType
} from '#shared/types/catalog'
import type { LocationQuery } from 'vue-router'

const VALID_COURSE_SORTS: ReadonlySet<CatalogSort> = new Set([
  'newest',
  'oldest',
  'title-asc',
  'title-desc'
])

const VALID_WEBINAR_SORTS: ReadonlySet<CatalogSort> = new Set([
  'newest',
  'oldest',
  'title-asc',
  'title-desc',
  'upcoming'
])

const DEFAULT_SORT: CatalogSort = 'newest'

/**
 * Parse the live route query into the normalized internal shape used by the
 * catalog UI. The URL is the source of truth; this function never throws —
 * unknown values collapse to the documented defaults so a malformed link
 * still renders something sane.
 */
export function parseCatalogQuery(
  query: LocationQuery,
  type: CatalogType
): CatalogQueryState {
  return {
    q: pickString(query.q),
    categories: pickList(query.categories),
    specialties: pickList(query.specialties),
    difficulty: pickList(query.difficulty),
    tags: pickList(query.tags),
    sort: pickSort(query.sort, type),
    page: pickPage(query.page)
  }
}

/**
 * Serialize a normalized state back into a `LocationQuery` ready for
 * `router.push`. Empty values, default sort, and page=1 are dropped so URLs
 * stay tidy and back-button history doesn't accumulate noise.
 */
export function serializeCatalogQuery(
  state: CatalogQueryState
): LocationQuery {
  const out: LocationQuery = {}
  if (state.q.trim() !== '') {
    out.q = state.q
  }
  if (state.categories.length > 0) {
    out.categories = state.categories.join(',')
  }
  if (state.specialties.length > 0) {
    out.specialties = state.specialties.join(',')
  }
  if (state.difficulty.length > 0) {
    out.difficulty = state.difficulty.join(',')
  }
  if (state.tags.length > 0) {
    out.tags = state.tags.join(',')
  }
  if (state.sort !== DEFAULT_SORT) {
    out.sort = state.sort
  }
  if (state.page > 1) {
    out.page = String(state.page)
  }
  return out
}

/**
 * Translate the internal state into the parameter shape the backend expects:
 * repeated singular keys (`category[]`, `specialty[]`, `difficulty[]`,
 * `tag[]`), plus `q`, `sort`, `page`, `per_page`. Empty filter lists are
 * omitted so the API receives the smallest possible query.
 */
export function buildBackendQuery(
  state: CatalogQueryState
): Record<string, string | string[] | number> {
  const out: Record<string, string | string[] | number> = {
    page: state.page,
    per_page: 12,
    sort: state.sort
  }
  if (state.q.trim() !== '') {
    out.q = state.q
  }
  if (state.categories.length > 0) {
    out['category[]'] = [...state.categories]
  }
  if (state.specialties.length > 0) {
    out['specialty[]'] = [...state.specialties]
  }
  if (state.difficulty.length > 0) {
    out['difficulty[]'] = [...state.difficulty]
  }
  if (state.tags.length > 0) {
    out['tag[]'] = [...state.tags]
  }
  return out
}

export function defaultSortFor(type: CatalogType): CatalogSort {
  return type === 'webinars' ? 'newest' : 'newest'
}

function pickString(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0]
  }
  return ''
}

function pickList(value: unknown): string[] {
  if (typeof value !== 'string' || value === '') {
    return []
  }
  return value
    .split(',')
    .map(s => s.trim())
    .filter(s => s !== '')
}

function pickSort(value: unknown, type: CatalogType): CatalogSort {
  const valid = type === 'webinars' ? VALID_WEBINAR_SORTS : VALID_COURSE_SORTS
  if (typeof value === 'string' && valid.has(value as CatalogSort)) {
    return value as CatalogSort
  }
  return DEFAULT_SORT
}

function pickPage(value: unknown): number {
  const raw = typeof value === 'string' ? Number.parseInt(value, 10) : NaN
  return Number.isFinite(raw) && raw > 1 ? raw : 1
}
