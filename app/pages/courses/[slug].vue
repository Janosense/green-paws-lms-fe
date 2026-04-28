<script setup lang="ts">
import type { CourseDetailResponse } from '#shared/types/catalog'
import { buildBreadcrumbSchema } from '~/utils/buildBreadcrumbSchema'
import { buildCourseSchema } from '~/utils/buildCourseSchema'

definePageMeta({
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()

const slug = computed(() => route.params.slug as string)

const { data, status, error, refresh } = await useApiFetch<CourseDetailResponse>(
  () => `/vl/v1/catalog/courses/${slug.value}`
)

const apiCode = computed(() => {
  const raw = error.value as { code?: unknown } | null
  return raw && typeof raw.code === 'string' ? raw.code : null
})

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

const seoTitle = computed(() => detail.value?.seo.title ?? t('catalog.courses.title'))
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
  const course = detail.value
  if (!course) {
    return []
  }
  return [
    buildCourseSchema(course, siteUrl),
    buildBreadcrumbSchema(
      {
        type: 'courses',
        title: course.title,
        canonicalPath: course.seo.canonical_path,
        category: course.categories[0] ?? null
      },
      siteUrl
    )
  ]
})

useStructuredData(structuredData.value)

function handleCtaClick() {
  if (!authStore.isAuthenticated) {
    void router.push({ path: '/login', query: { return_to: route.fullPath } })
    return
  }
  toast.add({
    title: t('landing.toast.enroll_soon.title'),
    description: t('landing.toast.enroll_soon.description_course'),
    icon: 'i-lucide-clock',
    color: 'info'
  })
}
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
      <CourseHero
        :course="detail"
        :is-authed="authStore.isAuthenticated"
        @cta-click="handleCtaClick"
      />

      <div class="mx-auto max-w-3xl space-y-12">
        <section class="space-y-4">
          <h2 class="text-2xl font-medium tracking-tight">
            {{ t('landing.course.section.about') }}
          </h2>
          <!-- eslint-disable vue/no-v-html -->
          <div
            v-if="detail.content"
            class="prose-content"
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

        <CurriculumAccordion :curriculum="detail.curriculum" />

        <LandingInstructors
          type="courses"
          :instructors="detail.instructors"
        />

        <LandingDetails
          type="courses"
          :course="detail"
        />
      </div>
    </div>
  </UContainer>
</template>

<style scoped>
.prose-content :deep(h2) {
  font-size: 1.25rem;
  font-weight: 500;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  letter-spacing: -0.005em;
}
.prose-content :deep(h3) {
  font-size: 1.05rem;
  font-weight: 500;
  margin-top: 1.25em;
  margin-bottom: 0.5em;
}
.prose-content :deep(p) {
  margin-bottom: 1em;
  line-height: 1.6;
}
.prose-content :deep(ul),
.prose-content :deep(ol) {
  padding-left: 1.5em;
  margin-bottom: 1em;
  line-height: 1.6;
}
.prose-content :deep(ul) {
  list-style: disc;
}
.prose-content :deep(ol) {
  list-style: decimal;
}
.prose-content :deep(a) {
  color: var(--ui-primary);
  text-decoration: underline;
}
.prose-content :deep(strong) {
  font-weight: 600;
}
.prose-content :deep(blockquote) {
  border-left: 2px solid var(--ui-border);
  padding-left: 1em;
  font-style: italic;
  color: var(--ui-text-muted);
  margin: 1em 0;
}
</style>
