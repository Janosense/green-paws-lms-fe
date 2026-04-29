<script setup lang="ts">
import type { SearchResponse } from '#shared/types/catalog'

definePageMeta({
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const queryTerm = computed(() => {
  const raw = route.query.q
  if (typeof raw === 'string') {
    return raw.trim()
  }
  if (Array.isArray(raw) && typeof raw[0] === 'string') {
    return raw[0].trim()
  }
  return ''
})

const currentPage = computed(() => {
  const raw = route.query.page
  const value = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN
  return Number.isFinite(value) && value >= 1 ? value : 1
})

const inputDraft = ref(queryTerm.value)
watch(queryTerm, (next) => {
  inputDraft.value = next
})

const backendQuery = computed(() => {
  if (!queryTerm.value) {
    return null
  }
  return { q: queryTerm.value, page: currentPage.value }
})

const shouldFetch = computed(() => backendQuery.value !== null)

// `useApiFetch` is keyed off the URL + query, so navigating with a new `?q=`
// or `?page=` rehydrates the response. The `immediate` flag prevents an
// initial fetch on the no-query landing — there is nothing to search for.
const { data, status, error, refresh } = await useApiFetch<SearchResponse>(
  '/vl/v1/search',
  {
    query: backendQuery,
    watch: [backendQuery],
    immediate: shouldFetch.value
  }
)

const result = computed(() => {
  const envelope = data.value
  return envelope && envelope.success ? envelope.data : null
})

const courses = computed(() => result.value?.courses ?? null)
const webinars = computed(() => result.value?.webinars ?? null)

const hasAnyResults = computed(() => {
  if (!result.value) {
    return false
  }
  return result.value.courses.items.length > 0 || result.value.webinars.items.length > 0
})

const isInitialLoad = computed(() => queryTerm.value !== '' && status.value === 'pending' && !result.value)
const hasError = computed(() => Boolean(error.value) && !result.value)

const seoTitle = computed(() =>
  queryTerm.value
    ? t('search.page_title.with_query', { q: queryTerm.value })
    : t('search.page_title.empty')
)

useSeoMeta({
  title: () => seoTitle.value,
  robots: 'noindex,follow'
})

useHead({
  meta: [
    { name: 'robots', content: 'noindex,follow' }
  ]
})

function submitSearch() {
  const value = inputDraft.value.trim()
  if (!value) {
    return
  }
  void router.push({ path: '/search', query: { q: value, page: 1 } })
}

function changePage(nextPage: number) {
  if (!queryTerm.value) {
    return
  }
  void router.push({
    path: '/search',
    query: { q: queryTerm.value, page: nextPage }
  })
  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<template>
  <UContainer class="py-8 lg:py-12">
    <div class="space-y-8 max-w-5xl mx-auto">
      <header class="space-y-2">
        <h1 class="text-3xl font-medium tracking-tight">
          {{ seoTitle }}
        </h1>
      </header>

      <form
        class="max-w-xl"
        @submit.prevent="submitSearch"
      >
        <UInput
          v-model="inputDraft"
          icon="i-lucide-search"
          size="lg"
          :placeholder="t('search.input.placeholder')"
          :autofocus="!queryTerm"
          class="w-full"
          :ui="{ base: 'w-full' }"
        />
      </form>

      <EmptyState
        v-if="!queryTerm"
        icon="i-lucide-search"
        :title="t('search.empty.no_query.title')"
      />

      <LoadingSkeleton
        v-else-if="isInitialLoad"
        variant="card"
        :count="6"
      />

      <ErrorState
        v-else-if="hasError"
        icon="i-lucide-alert-triangle"
        :title="t('search.error.title')"
      >
        <UButton
          color="primary"
          icon="i-lucide-rotate-ccw"
          @click="refresh()"
        >
          {{ t('search.error.retry') }}
        </UButton>
      </ErrorState>

      <EmptyState
        v-else-if="result && !hasAnyResults"
        icon="i-lucide-search-x"
        :title="t('search.empty.no_results.title', { q: queryTerm })"
        :description="t('search.empty.no_results.description')"
      >
        <UButton
          to="/courses"
          color="neutral"
          variant="subtle"
        >
          {{ t('search.empty.no_results.action') }}
        </UButton>
      </EmptyState>

      <div
        v-else-if="result && hasAnyResults"
        class="space-y-12"
      >
        <section
          v-if="courses && courses.items.length > 0"
          class="space-y-6"
        >
          <div class="space-y-1">
            <h2 class="text-2xl font-medium tracking-tight">
              {{ t('search.section.courses') }}
            </h2>
            <p class="text-sm text-muted">
              <!-- TODO: pluralization -->
              {{ t('search.results_count.courses', { count: courses.pagination.total }) }}
            </p>
          </div>

          <ul class="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
            <li
              v-for="item in courses.items"
              :key="item.id"
            >
              <CourseCard :course="item" />
            </li>
          </ul>

          <div
            v-if="courses.pagination.total_pages > 1"
            class="flex justify-center pt-2"
          >
            <UPagination
              :model-value="courses.pagination.page"
              :items-per-page="courses.pagination.per_page"
              :total="courses.pagination.total"
              @update:model-value="changePage"
            />
          </div>
        </section>

        <section
          v-if="webinars && webinars.items.length > 0"
          class="space-y-6"
        >
          <div class="space-y-1">
            <h2 class="text-2xl font-medium tracking-tight">
              {{ t('search.section.webinars') }}
            </h2>
            <p class="text-sm text-muted">
              <!-- TODO: pluralization -->
              {{ t('search.results_count.webinars', { count: webinars.pagination.total }) }}
            </p>
          </div>

          <ul class="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
            <li
              v-for="item in webinars.items"
              :key="item.id"
            >
              <WebinarCard :webinar="item" />
            </li>
          </ul>

          <div
            v-if="webinars.pagination.total_pages > 1"
            class="flex justify-center pt-2"
          >
            <UPagination
              :model-value="webinars.pagination.page"
              :items-per-page="webinars.pagination.per_page"
              :total="webinars.pagination.total"
              @update:model-value="changePage"
            />
          </div>
        </section>
      </div>
    </div>
  </UContainer>
</template>
