<script setup lang="ts">
import { resolveCertificateError } from '~/utils/resolveCertificateError'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  validate: route => /^[a-f0-9-]{36}$/.test(String(route.params.uuid))
})

const route = useRoute()
const uuid = computed(() => String(route.params.uuid))

const { t } = useI18n()

const { detail, isLoading, error, refresh } = useCertificate(uuid)
const { download, isDownloading } = useCertificateDownload()

useHead({
  title: () => detail.value
    ? `${detail.value.course_title} — ${t('certificate.public.title')}`
    : t('certificate.public.title'),
  meta: [{ name: 'robots', content: 'noindex,follow' }]
})

const isRevoked = computed(() => detail.value?.status === 'revoked')

const errorResolution = computed(() =>
  error.value ? resolveCertificateError(error.value) : null
)

async function onDownload(): Promise<void> {
  if (!detail.value) return
  await download(detail.value)
}
</script>

<template>
  <UContainer class="py-10">
    <div class="space-y-6 max-w-3xl">
      <UButton
        to="/dashboard/certificates"
        variant="link"
        color="neutral"
        icon="i-lucide-arrow-left"
        :padded="false"
      >
        {{ t('certificate.detail.back') }}
      </UButton>

      <LoadingSkeleton
        v-if="isLoading && !detail"
        variant="card"
        :count="1"
      />

      <CertificateError
        v-else-if="errorResolution && !detail"
        :error-key="errorResolution.key"
        :fatal="errorResolution.fatal"
      />

      <template v-else-if="detail">
        <CertificateRevokedBanner
          v-if="isRevoked && detail.revoked_at"
          variant="inline"
          :revoked-at="detail.revoked_at"
        />

        <UCard>
          <div class="space-y-6">
            <div class="space-y-2">
              <h1 class="text-2xl md:text-3xl font-medium tracking-tight">
                {{ detail.course_title }}
              </h1>
              <p class="text-sm text-muted">
                {{ t('certificate.public.issuedAt', {
                  issuer: detail.issuer_name,
                  date: ''
                }).trim() }}
              </p>
            </div>

            <CertificateMetaBlock
              :course-title="detail.course_title"
              :issuer-name="detail.issuer_name"
              :issued-at="detail.issued_at"
              :instructor-names="detail.instructor_names"
              :final-score-pct="detail.final_score_pct"
              :learner-name="detail.learner_full_name"
            />

            <div class="flex flex-wrap items-center gap-3 pt-2">
              <UTooltip
                v-if="isRevoked"
                :text="t('certificate.detail.downloadUnavailable')"
              >
                <UButton
                  color="primary"
                  icon="i-lucide-download"
                  disabled
                >
                  {{ t('certificate.detail.download') }}
                </UButton>
              </UTooltip>
              <UButton
                v-else
                color="primary"
                icon="i-lucide-download"
                :loading="isDownloading"
                @click="onDownload"
              >
                {{ t('certificate.detail.download') }}
              </UButton>

              <UButton
                :to="detail.verification_url"
                target="_blank"
                rel="noopener"
                variant="ghost"
                color="neutral"
                icon="i-lucide-external-link"
              >
                {{ t('certificate.detail.verifyLink') }}
              </UButton>
            </div>

            <p class="text-xs text-muted">
              {{ t('certificate.detail.verifyLinkHint') }}
            </p>

            <p class="text-xs text-muted font-mono pt-2 border-t border-default">
              {{ t('certificate.detail.fields.uuid') }}: {{ detail.uuid }}
            </p>
          </div>
        </UCard>
      </template>

      <ErrorState
        v-else
        icon="i-lucide-alert-triangle"
        :title="t('common.error_title')"
        :description="t('certificate.errors.internal')"
      >
        <UButton
          color="primary"
          icon="i-lucide-rotate-ccw"
          @click="refresh()"
        >
          {{ t('common.try_again') }}
        </UButton>
      </ErrorState>
    </div>
  </UContainer>
</template>
