<script setup lang="ts">
import type { CertificatePublicResponse } from '#shared/types/certificate'

definePageMeta({
  layout: 'default',
  validate: route => /^[a-f0-9-]{36}$/.test(String(route.params.uuid))
})

const route = useRoute()
const uuid = computed(() => String(route.params.uuid))

const { t, locale } = useI18n()

useHead({
  title: () => t('certificate.public.title'),
  meta: [{ name: 'robots', content: 'noindex,follow' }]
})

// SSR-friendly fetch via `useApiFetch`. The backend public route is
// `__return_true` and emits its own `X-Robots-Tag: noindex,follow`; we
// duplicate the meta tag for proxies that don't surface response headers
// to crawlers. Authed visitors will still send a bearer (the interceptor
// always attaches one when present), but the route ignores it — there
// is no `auth: false` opt-out on `useApiFetch`'s public typings.
const { data, error, status } = await useApiFetch<CertificatePublicResponse>(
  () => `/vl/v1/certificates/${uuid.value}/public`
)

const certificate = computed(() => {
  const envelope = data.value
  return envelope && envelope.success ? envelope.data : null
})

const isLoading = computed(() => status.value === 'pending')

const httpStatus = computed(() => {
  const e = error.value as { status?: number } | null
  return e?.status ?? 0
})

const isNotFound = computed(() => httpStatus.value === 404)
const hasOtherError = computed(() => Boolean(error.value) && !isNotFound.value)

const isRevoked = computed(() => certificate.value?.status === 'revoked')

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  try {
    return new Intl.DateTimeFormat(locale.value, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  } catch {
    return iso
  }
}
</script>

<template>
  <UContainer class="py-12">
    <div class="max-w-2xl mx-auto">
      <div
        v-if="isLoading"
        class="flex justify-center py-16"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-10 text-muted animate-spin"
        />
      </div>

      <NotFound v-else-if="isNotFound" />

      <ErrorState
        v-else-if="hasOtherError"
        icon="i-lucide-alert-triangle"
        :title="t('common.error_title')"
        :description="t('certificate.errors.internal')"
      >
        <UButton
          to="/"
          color="primary"
        >
          {{ t('common.actions.go_home') }}
        </UButton>
      </ErrorState>

      <UCard v-else-if="certificate">
        <div class="space-y-6">
          <CertificateRevokedBanner
            v-if="isRevoked && certificate.revoked_at"
            variant="hero"
            :revoked-at="certificate.revoked_at"
          />

          <div
            v-else
            class="flex flex-col items-center text-center gap-4"
          >
            <UIcon
              name="i-lucide-shield-check"
              class="size-16 text-primary"
            />
            <h1 class="text-2xl md:text-3xl font-medium tracking-tight">
              {{ t('certificate.public.activeHeadline') }}
            </h1>
            <p class="text-sm text-muted">
              {{ t('certificate.public.issuedAt', {
                issuer: certificate.issuer_name,
                date: formatDate(certificate.issued_at)
              }) }}
            </p>
          </div>

          <CertificateMetaBlock
            :course-title="certificate.course_title"
            :issuer-name="certificate.issuer_name"
            :issued-at="certificate.issued_at"
            :instructor-names="certificate.instructor_names"
            :final-score-pct="isRevoked ? null : certificate.final_score_pct"
            :learner-name="certificate.learner_display_name"
          />

          <p class="text-xs text-muted font-mono pt-2 border-t border-default">
            {{ t('certificate.detail.fields.uuid') }}: {{ certificate.uuid }}
          </p>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
