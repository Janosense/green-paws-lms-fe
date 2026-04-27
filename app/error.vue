<script setup lang="ts">
import type { NuxtError } from '#app'

interface Props {
  error: NuxtError
}

const { error } = defineProps<Props>()

const { t } = useI18n()

const isNotFound = computed(() => Number(error.statusCode) === 404)

const errorTitle = computed(() => `${error.statusCode ?? 500} — ${t('common.error.default_title')}`)

function goHome() {
  void clearError({ redirect: '/' })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-default">
    <NotFound v-if="isNotFound" />
    <ErrorState
      v-else
      :title="errorTitle"
      :description="error.statusMessage || error.message"
    >
      <UButton
        color="primary"
        @click="goHome"
      >
        {{ t('common.actions.go_home') }}
      </UButton>
    </ErrorState>
  </div>
</template>
