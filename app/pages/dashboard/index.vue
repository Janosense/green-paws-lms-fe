<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { t } = useI18n()
useHead({ title: () => t('dashboard.title') })

const enrollments = useEnrollmentsStore()
const nuxtApp = useNuxtApp()

// Boot plugin already calls init() on the server pass for authed users, so
// SSR renders the real list when the cookie is present. The watcher on the
// auth-state flip handles in-session login transitions; this guard covers
// the cold-cache page-refresh path where the initialized flag is fresh.
//
// When the store is already hydrated, revalidate in the background: the
// learner returning from the player must see the progress they just made
// (progress_pct + the stats rows), and init() alone would keep serving
// the boot-time snapshot until a hard reload. The stale grid stays
// rendered while the refetch lands (isInitialLoading requires
// !initialized), so there is no skeleton flash. Skipped during hydration
// — the SSR pass fetched this list moments ago.
if (!enrollments.initialized) {
  await enrollments.init()
} else if (import.meta.client && !nuxtApp.isHydrating) {
  void enrollments.refresh()
}

const isInitialLoading = computed(() =>
  !enrollments.initialized && enrollments.status === 'loading'
)
// Items present → keep showing them even if a background revalidation
// failed; stale cards beat an error screen. The dedicated error state is
// for the nothing-to-render case.
const showError = computed(() =>
  enrollments.status === 'error' && enrollments.items.length === 0
)
const showEmpty = computed(() =>
  enrollments.initialized && !showError.value && enrollments.items.length === 0
)
const showGrid = computed(() => enrollments.items.length > 0)
</script>

<template>
  <UContainer class="py-10">
    <div class="space-y-8">
      <h1 class="text-3xl font-medium tracking-tight">
        {{ t('dashboard.title') }}
      </h1>

      <LoadingSkeleton
        v-if="isInitialLoading"
        variant="card"
        :count="3"
      />

      <ErrorState
        v-else-if="showError"
        icon="i-lucide-alert-triangle"
        :title="t('dashboard.error.title')"
        :description="t('dashboard.error.description')"
      >
        <UButton
          color="primary"
          icon="i-lucide-rotate-ccw"
          @click="enrollments.refresh()"
        >
          {{ t('dashboard.error.retry') }}
        </UButton>
      </ErrorState>

      <EmptyState
        v-else-if="showEmpty"
        icon="i-lucide-book-open"
        :title="t('dashboard.empty.title')"
        :description="t('dashboard.empty.description')"
      >
        <UButton
          to="/courses"
          color="primary"
        >
          {{ t('dashboard.empty.cta') }}
        </UButton>
      </EmptyState>

      <div
        v-else-if="showGrid"
        class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
      >
        <EnrolledCourseCard
          v-for="enrollment in enrollments.items"
          :key="enrollment.id"
          :enrollment="enrollment"
        />
      </div>
    </div>
  </UContainer>
</template>
