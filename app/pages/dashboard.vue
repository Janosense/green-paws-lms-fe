<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { t } = useI18n()
useHead({ title: () => t('dashboard.title') })
</script>

<template>
  <UContainer class="py-10">
    <EmptyState
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
  </UContainer>
</template>
