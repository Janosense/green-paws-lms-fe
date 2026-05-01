<script setup lang="ts">
import { resolveCertificateError } from '~/utils/resolveCertificateError'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { t } = useI18n()
useHead({
  title: () => t('certificate.list.title'),
  meta: [{ name: 'robots', content: 'noindex,follow' }]
})

const certificatesStore = useCertificatesStore()

// Boot plugin already calls init() server-side for authed users; this guard
// covers cold-cache page-refresh paths where the plugin hasn't run yet.
if (!certificatesStore.initialized) {
  await certificatesStore.init()
}

const isInitialLoading = computed(() =>
  !certificatesStore.initialized && certificatesStore.status === 'loading'
)
const showError = computed(() => certificatesStore.status === 'error')
const showEmpty = computed(() =>
  certificatesStore.initialized && !showError.value && certificatesStore.items.length === 0
)
const showGrid = computed(() => certificatesStore.items.length > 0)

const errorResolution = computed(() => resolveCertificateError(certificatesStore.error))
</script>

<template>
  <UContainer class="py-10">
    <div class="space-y-8">
      <h1 class="text-3xl font-medium tracking-tight">
        {{ t('certificate.list.title') }}
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
          @click="certificatesStore.refresh()"
        >
          {{ t('common.try_again') }}
        </UButton>
      </ErrorState>

      <EmptyState
        v-else-if="showEmpty"
        icon="i-lucide-award"
        :title="t('certificate.list.empty.title')"
        :description="t('certificate.list.empty.body')"
      >
        <UButton
          to="/courses"
          color="primary"
        >
          {{ t('certificate.list.empty.cta') }}
        </UButton>
      </EmptyState>

      <div
        v-else-if="showGrid"
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
      >
        <CertificateListCard
          v-for="item in certificatesStore.items"
          :key="item.uuid"
          :item="item"
        />
      </div>
    </div>
  </UContainer>
</template>
