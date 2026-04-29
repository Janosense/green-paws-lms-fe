<script setup lang="ts">
interface Props {
  completed: boolean
}
defineProps<Props>()
const emit = defineEmits<{ click: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex justify-end mb-4">
    <UBadge
      v-if="completed"
      color="success"
      variant="solid"
      icon="i-lucide-check-circle-2"
      size="lg"
    >
      {{ t('learn.complete.badge') }}
    </UBadge>
    <UButton
      v-else
      color="primary"
      variant="solid"
      icon="i-lucide-circle-check"
      @click="emit('click')"
    >
      {{ t('learn.complete.cta') }}
    </UButton>
  </div>
</template>
