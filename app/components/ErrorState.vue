<script setup lang="ts">
interface Props {
  icon?: string
  title: string
  description?: string
}

const { icon = 'i-lucide-alert-triangle', title, description } = defineProps<Props>()
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center px-6 py-16 gap-4">
    <UIcon
      :name="icon"
      class="size-10 text-error"
    />
    <div class="space-y-2 max-w-md">
      <h2 class="text-lg font-medium text-default">
        {{ title }}
      </h2>
      <p
        v-if="description"
        class="text-sm text-muted"
      >
        {{ description }}
      </p>
    </div>
    <div
      v-if="$slots.default"
      class="pt-2"
    >
      <slot />
    </div>
  </div>
</template>
