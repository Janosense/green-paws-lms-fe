<script setup lang="ts">
import type {
  CatalogListData,
  CatalogQueryState,
  CatalogSort,
  CatalogType,
  CourseCardItem,
  CourseListResponse,
  TaxonomyResponse,
  TaxonomyTerm,
  WebinarCardItem,
  WebinarListResponse
} from '#shared/types/catalog'
import {
  buildBackendQuery,
  parseCatalogQuery,
  serializeCatalogQuery
} from '~/utils/buildCatalogQuery'

interface Props {
  type: CatalogType
}

const props = defineProps<Props>()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const state = computed<CatalogQueryState>(() =>
  parseCatalogQuery(route.query, props.type)
)

const backendQuery = computed(() => buildBackendQuery(state.value))

type ListResponse = CourseListResponse | WebinarListResponse

const path = computed(() => `/vl/v1/catalog/${props.type}`)

const { data, status, error, refresh } = await useApiFetch<ListResponse>(path, {
  query: backendQuery,
  watch: [backendQuery]
})

const list = computed<CatalogListData<CourseCardItem | WebinarCardItem> | null>(() => {
  const envelope = data.value
  if (!envelope || !envelope.success) {
    return null
  }
  return envelope.data
})

const items = computed(() => list.value?.items ?? [])
const pagination = computed(() => list.value?.pagination ?? {
  page: 1,
  per_page: 12,
  total: 0,
  total_pages: 0
})

const isFirstLoad = computed(() => status.value === 'pending' && list.value === null)
const isRefetching = computed(() => status.value === 'pending' && list.value !== null)

// Taxonomy fetches — fired once on mount, in parallel.
const taxonomyPostType = computed(() =>
  props.type === 'webinars' ? 'vl_webinar' : 'vl_course'
)

const taxonomyQuery = computed(() => ({
  post_type: taxonomyPostType.value,
  in_use: 1
}))

const { data: categoryData } = await useApiFetch<TaxonomyResponse>(
  '/vl/v1/taxonomies/vl_category',
  { query: taxonomyQuery, watch: [taxonomyQuery] }
)
const { data: specialtyData } = await useApiFetch<TaxonomyResponse>(
  '/vl/v1/taxonomies/vl_specialty',
  { query: taxonomyQuery, watch: [taxonomyQuery] }
)
const { data: difficultyData } = await useApiFetch<TaxonomyResponse>(
  '/vl/v1/taxonomies/vl_difficulty',
  { query: taxonomyQuery, watch: [taxonomyQuery] }
)
const { data: tagData } = await useApiFetch<TaxonomyResponse>(
  '/vl/v1/taxonomies/vl_tag',
  { query: taxonomyQuery, watch: [taxonomyQuery] }
)

function pickTerms(envelope: TaxonomyResponse | null | undefined): TaxonomyTerm[] {
  if (!envelope || !envelope.success) {
    return []
  }
  return envelope.data.items
}

const termsByTaxonomy = computed(() => ({
  vl_category: pickTerms(categoryData.value),
  vl_specialty: pickTerms(specialtyData.value),
  vl_difficulty: pickTerms(difficultyData.value),
  vl_tag: pickTerms(tagData.value)
}))

// Sort options — webinars get an extra `upcoming` slot.
const sortOptions = computed<{ value: CatalogSort, label: string }[]>(() => {
  const base: { value: CatalogSort, label: string }[] = [
    { value: 'newest', label: t('catalog.sort.options.newest') },
    { value: 'oldest', label: t('catalog.sort.options.oldest') },
    { value: 'title-asc', label: t('catalog.sort.options.title_asc') },
    { value: 'title-desc', label: t('catalog.sort.options.title_desc') }
  ]
  if (props.type === 'webinars') {
    base.push({ value: 'upcoming', label: t('catalog.sort.options.upcoming') })
  }
  return base
})

const selectedSort = computed<CatalogSort>({
  get: () => state.value.sort,
  set: (next) => {
    pushState({ ...state.value, sort: next, page: 1 })
  }
})

const isFiltersOpen = ref(false)

// State mutation helpers — every push goes through `serializeCatalogQuery`
// so empty values, default sort, and page=1 are all dropped from the URL.
function pushState(next: CatalogQueryState) {
  void router.push({
    path: route.path,
    query: serializeCatalogQuery(next)
  })
}

function toggleTerm(taxonomy: 'vl_category' | 'vl_specialty' | 'vl_difficulty' | 'vl_tag', slug: string) {
  const facetKey = (
    {
      vl_category: 'categories',
      vl_specialty: 'specialties',
      vl_difficulty: 'difficulty',
      vl_tag: 'tags'
    } as const
  )[taxonomy]
  const current = state.value[facetKey]
  const nextList = current.includes(slug)
    ? current.filter(s => s !== slug)
    : [...current, slug]
  pushState({ ...state.value, [facetKey]: nextList, page: 1 })
}

function commitSearch(value: string) {
  pushState({ ...state.value, q: value, page: 1 })
}

function clearAll() {
  pushState({
    q: '',
    categories: [],
    specialties: [],
    difficulty: [],
    tags: [],
    sort: state.value.sort,
    page: 1
  })
}

function removeChip(chip: { facet: 'q' | 'categories' | 'specialties' | 'difficulty' | 'tags', value: string }) {
  if (chip.facet === 'q') {
    pushState({ ...state.value, q: '', page: 1 })
    return
  }
  const list = state.value[chip.facet].filter(s => s !== chip.value)
  pushState({ ...state.value, [chip.facet]: list, page: 1 })
}

function changePage(nextPage: number) {
  pushState({ ...state.value, page: nextPage })
  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <h1 class="text-3xl font-medium tracking-tight">
            {{ t(`catalog.${props.type}.title`) }}
          </h1>
          <p
            v-if="!isFirstLoad && !error"
            class="text-sm text-muted"
          >
            {{ t('catalog.results_count', { count: pagination.total }) }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <USelectMenu
            v-model="selectedSort"
            :items="sortOptions"
            :search-input="false"
            value-key="value"
            label-key="label"
            class="min-w-[200px]"
            :aria-label="t('catalog.sort.label')"
          />
          <UButton
            class="lg:hidden"
            color="neutral"
            variant="outline"
            icon="i-lucide-sliders-horizontal"
            @click="isFiltersOpen = true"
          >
            {{ t('catalog.filters.title') }}
          </UButton>
        </div>
      </header>

      <CatalogActiveChips
        :state="state"
        :terms-by-taxonomy="termsByTaxonomy"
        @remove="removeChip"
        @clear-all="clearAll"
      />

      <div class="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside class="hidden lg:block">
          <CatalogFilterSidebar
            :state="state"
            :terms-by-taxonomy="termsByTaxonomy"
            @update:q="commitSearch"
            @commit:q="commitSearch"
            @toggle-term="toggleTerm"
          />
        </aside>

        <section class="min-w-0">
          <LoadingSkeleton
            v-if="isFirstLoad"
            variant="card"
            :count="6"
          />

          <ErrorState
            v-else-if="error"
            icon="i-lucide-alert-triangle"
            :title="t('catalog.error.title')"
            :description="t('catalog.error.description')"
          >
            <UButton
              color="primary"
              icon="i-lucide-rotate-ccw"
              @click="refresh()"
            >
              {{ t('catalog.error.retry') }}
            </UButton>
          </ErrorState>

          <EmptyState
            v-else-if="items.length === 0"
            icon="i-lucide-search-x"
            :title="t(`catalog.${props.type}.empty.title`)"
            :description="t(`catalog.${props.type}.empty.description`)"
          >
            <UButton
              color="neutral"
              variant="subtle"
              @click="clearAll"
            >
              {{ t('catalog.filters.clear_filters') }}
            </UButton>
          </EmptyState>

          <div
            v-else
            class="space-y-8"
            :class="isRefetching ? 'opacity-60 transition-opacity' : ''"
          >
            <ul class="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
              <li
                v-for="item in items"
                :key="item.id"
              >
                <CatalogCourseCard
                  v-if="props.type === 'courses'"
                  :course="(item as CourseCardItem)"
                />
                <CatalogWebinarCard
                  v-else
                  :webinar="(item as WebinarCardItem)"
                />
              </li>
            </ul>

            <div
              v-if="pagination.total_pages > 1"
              class="flex justify-center pt-4"
            >
              <UPagination
                :model-value="pagination.page"
                :items-per-page="pagination.per_page"
                :total="pagination.total"
                @update:model-value="changePage"
              />
            </div>
          </div>
        </section>
      </div>
    </div>

    <USlideover
      v-model:open="isFiltersOpen"
      :title="t('catalog.filters.title')"
      side="left"
    >
      <template #body>
        <CatalogFilterSidebar
          :state="state"
          :terms-by-taxonomy="termsByTaxonomy"
          @update:q="commitSearch"
          @commit:q="commitSearch"
          @toggle-term="toggleTerm"
        />
      </template>
    </USlideover>
  </UContainer>
</template>
