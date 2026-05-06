<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { t } = useI18n()
useHead({ title: () => t('dashboard.title') })

const enrollments = useEnrollmentsStore()

// Boot plugin already calls init() on the server pass for authed users, so
// SSR renders the real list when the cookie is present. The watcher on the
// auth-state flip handles in-session login transitions; this guard covers
// the cold-cache page-refresh path where the initialized flag is fresh.
if (!enrollments.initialized) {
  await enrollments.init()
}

const isInitialLoading = computed(() =>
  !enrollments.initialized && enrollments.status === 'loading'
)
const showError = computed(() => enrollments.status === 'error')
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
