<script setup lang="ts">
interface Props {
  completed: boolean
  hint?: string
}
defineProps<Props>()
const emit = defineEmits<{ click: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex justify-end items-center gap-3 mb-4">
    <template v-if="completed">
      <UBadge
        color="success"
        variant="solid"
        icon="i-lucide-check-circle-2"
        size="lg"
      >
        {{ t('learn.complete.badge') }}
      </UBadge>
    </template>
    <template v-else>
      <p
        v-if="hint"
        class="text-sm text-muted text-right"
      >
        {{ hint }}
      </p>
      <UButton
        color="primary"
        variant="solid"
        icon="i-lucide-circle-check"
        @click="emit('click')"
      >
        {{ t('learn.complete.cta') }}
      </UButton>
    </template>
  </div>
</template>
