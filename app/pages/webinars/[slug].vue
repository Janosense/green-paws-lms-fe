<script setup lang="ts">
import type { WebinarDetailResponse } from '#shared/types/catalog'
import { apiErrorCode } from '~/utils/apiErrorCode'
import { buildBreadcrumbSchema } from '~/utils/buildBreadcrumbSchema'
import { buildEventSchema } from '~/utils/buildEventSchema'

definePageMeta({
  layout: 'default'
})

const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()

const slug = computed(() => route.params.slug as string)

const { data, status, error, refresh } = await useApiFetch<WebinarDetailResponse>(
  () => `/vl/v1/catalog/webinars/${slug.value}`
)

const apiCode = computed(() => apiErrorCode(error.value))

if (apiCode.value === 'vl_lms_not_found') {
  throw createError({
    statusCode: 404,
    statusMessage: 'Resource not found',
    fatal: true
  })
}

const detail = computed(() => {
  const envelope = data.value
  return envelope && envelope.success ? envelope.data : null
})

const seoTitle = computed(() => detail.value?.seo.title ?? t('catalog.webinars.title'))
const seoDescription = computed(() => detail.value?.seo.description ?? '')
const seoOgImage = computed(() => detail.value?.seo.og_image ?? undefined)
const canonicalPath = computed(() => detail.value?.seo.canonical_path ?? route.path)

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
  ogImage: () => seoOgImage.value,
  ogType: 'website',
  twitterCard: 'summary_large_image'
})

useHead({
  // The API-emitted title already contains the brand suffix; bypass the
  // global titleTemplate so we don't double-suffix it on landing pages.
  titleTemplate: '%s',
  link: [{ rel: 'canonical', href: canonicalPath }]
})

const { siteUrl } = useSiteUrl()
const structuredData = computed(() => {
  const webinar = detail.value
  if (!webinar) {
    return []
  }
  return [
    buildEventSchema(webinar, siteUrl),
    buildBreadcrumbSchema(
      {
        type: 'webinars',
        title: webinar.title,
        canonicalPath: webinar.seo.canonical_path,
        category: webinar.categories[0] ?? null
      },
      siteUrl
    )
  ]
})

useStructuredData(structuredData.value)
</script>

<template>
  <UContainer class="py-8 lg:py-12">
    <ErrorState
      v-if="error && !detail"
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

    <LoadingSkeleton
      v-else-if="status === 'pending' && !detail"
      variant="card"
      :count="3"
    />

    <div
      v-else-if="detail"
      class="space-y-12 lg:space-y-16"
    >
      <WebinarHero
        :webinar="detail"
        :is-authed="authStore.isAuthenticated"
      />

      <div class="mx-auto max-w-3xl space-y-12">
        <section class="space-y-4">
          <h2 class="text-2xl font-medium tracking-tight">
            {{ t('landing.webinar.section.about') }}
          </h2>
          <!-- eslint-disable vue/no-v-html -->
          <div
            v-if="detail.content"
            class="vl-rich-text"
            v-html="detail.content"
          />
          <!-- eslint-enable vue/no-v-html -->
          <p
            v-else
            class="text-sm text-muted"
          >
            {{ t('landing.course.about_empty') }}
          </p>
        </section>

        <WebinarMaterials :materials="detail.materials" />

        <LandingInstructors
          type="webinars"
          :instructors="detail.instructors"
        />

        <LandingDetails
          type="webinars"
          :webinar="detail"
        />
      </div>
    </div>
  </UContainer>
</template>
