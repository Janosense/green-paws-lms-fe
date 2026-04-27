<script setup lang="ts">
interface Props {
  title?: string
  description?: string
}

const props = defineProps<Props>()

const { t } = useI18n()

const resolvedTitle = computed(() => props.title ?? t('pages.not_found.title'))
const resolvedDescription = computed(() => props.description ?? t('pages.not_found.description'))
</script>

<template>
  <EmptyState
    icon="i-lucide-compass-off"
    :title="resolvedTitle"
    :description="resolvedDescription"
  >
    <UButton
      to="/"
      color="primary"
    >
      {{ t('common.actions.go_home') }}
    </UButton>
  </EmptyState>
</template>
