<script setup lang="ts">
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
    :title="t('quiz.errors.title')"
    :description="t(errorKey)"
  >
    <div class="flex flex-wrap gap-3 justify-center">
      <UButton
        color="primary"
        to="/dashboard"
      >
        {{ t('quiz.errors.backToDashboard') }}
      </UButton>
    </div>
  </ErrorState>
</template>
