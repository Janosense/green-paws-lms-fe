<script setup lang="ts">
/**
 * Phase 6.4 — fatal-error slate for the certificate surfaces. Mirrors
 * `QuizError` from Phase 6.2: wraps `<ErrorState>` with a
 * back-to-dashboard escape hatch.
 *
 * @author Tymofii Synianskyi
 */
interface Props {
  errorKey: string
  fatal: boolean
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <ErrorState
    icon="i-lucide-circle-alert"
    :title="t('common.error_title')"
    :description="t(errorKey)"
  >
    <div
      v-if="fatal"
      class="flex flex-wrap gap-3 justify-center"
    >
      <UButton
        color="primary"
        to="/dashboard/certificates"
      >
        {{ t('certificate.detail.back') }}
      </UButton>
    </div>
  </ErrorState>
</template>
