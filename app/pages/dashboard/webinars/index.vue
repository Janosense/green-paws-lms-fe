<script setup lang="ts">
import { resolveWebinarError } from '~/utils/resolveWebinarError'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { t } = useI18n()
useHead({
  title: () => t('webinar.page_title'),
  meta: [{ name: 'robots', content: 'noindex,follow' }]
})

const store = useWebinarRegistrationsStore()

if (!store.initialized) {
  await store.init()
}

const isInitialLoading = computed(() =>
  !store.initialized && store.status === 'loading'
)
const showError = computed(() => store.status === 'error')
const totalCount = computed(
  () => store.activeRegistrations.length
    + store.pastRegistrations.length
    + store.cancelledRegistrations.length
)
const showEmpty = computed(() =>
  store.initialized && !showError.value && totalCount.value === 0
)
const showSections = computed(() => totalCount.value > 0)

const errorResolution = computed(() => resolveWebinarError(store.error))

const showCancelled = ref(false)
</script>

<template>
  <UContainer class="py-10">
    <div class="space-y-8">
      <h1 class="text-3xl font-medium tracking-tight">
        {{ t('webinar.page_title') }}
      </h1>

      <LoadingSkeleton
        v-if="isInitialLoading"
        variant="card"
        :count="3"
      />

      <ErrorState
        v-else-if="showError"
        icon="i-lucide-alert-triangle"
        :title="t('common.error_title')"
        :description="t(errorResolution.key)"
      >
        <UButton
          color="primary"
          icon="i-lucide-rotate-ccw"
          @click="store.refresh()"
        >
          {{ t('common.try_again') }}
        </UButton>
      </ErrorState>

      <EmptyState
        v-else-if="showEmpty"
        icon="i-lucide-calendar-check"
        :title="t('webinar.empty.title')"
        :description="t('webinar.empty.description')"
      >
        <UButton
          to="/webinars"
          color="primary"
        >
          {{ t('webinar.empty.cta') }}
        </UButton>
      </EmptyState>

      <div
        v-else-if="showSections"
        class="space-y-10"
      >
        <section class="space-y-4">
          <h2 class="text-xl font-medium">
            {{ t('webinar.section.upcoming') }}
          </h2>
          <div
            v-if="store.activeRegistrations.length > 0"
            class="space-y-3"
          >
            <RegisteredWebinarCard
              v-for="r in store.activeRegistrations"
              :key="r.id"
              :registration="r"
            />
          </div>
          <p
            v-else
            class="text-sm text-muted"
          >
            {{ t('webinar.section.empty_upcoming') }}
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-medium">
            {{ t('webinar.section.past') }}
          </h2>
          <div
            v-if="store.pastRegistrations.length > 0"
            class="space-y-3"
          >
            <RegisteredWebinarCard
              v-for="r in store.pastRegistrations"
              :key="r.id"
              :registration="r"
            />
          </div>
          <p
            v-else
            class="text-sm text-muted"
          >
            {{ t('webinar.section.empty_past') }}
          </p>
        </section>

        <section
          v-if="store.cancelledRegistrations.length > 0"
          class="space-y-4"
        >
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :icon="showCancelled ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            @click="showCancelled = !showCancelled"
          >
            {{ t('webinar.show_cancelled_toggle') }} ({{ store.cancelledRegistrations.length }})
          </UButton>
          <div
            v-if="showCancelled"
            class="space-y-3"
          >
            <RegisteredWebinarCard
              v-for="r in store.cancelledRegistrations"
              :key="r.id"
              :registration="r"
            />
          </div>
        </section>
      </div>
    </div>
  </UContainer>
</template>
