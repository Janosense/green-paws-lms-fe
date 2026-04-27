<script setup lang="ts">
type Variant = 'card' | 'list' | 'text'

interface Props {
  variant?: Variant
  count?: number
}

const { variant = 'text', count = 3 } = defineProps<Props>()

const items = computed(() => Array.from({ length: count }, (_, i) => i))
</script>

<template>
  <div
    v-if="variant === 'text'"
    class="space-y-3"
    aria-busy="true"
  >
    <div
      v-for="i in items"
      :key="i"
      class="space-y-2"
    >
      <USkeleton class="h-3 w-full" />
      <USkeleton class="h-3 w-5/6" />
      <USkeleton class="h-3 w-2/3" />
    </div>
  </div>

  <div
    v-else-if="variant === 'list'"
    class="space-y-3"
    aria-busy="true"
  >
    <div
      v-for="i in items"
      :key="i"
      class="flex items-center gap-3 py-3"
    >
      <USkeleton class="size-10 shrink-0 rounded-full" />
      <div class="flex-1 space-y-2">
        <USkeleton class="h-3 w-1/3" />
        <USkeleton class="h-3 w-2/3" />
      </div>
    </div>
  </div>

  <div
    v-else
    class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    aria-busy="true"
  >
    <div
      v-for="i in items"
      :key="i"
      class="space-y-3"
    >
      <USkeleton class="aspect-video w-full rounded-md" />
      <USkeleton class="h-4 w-3/4" />
      <USkeleton class="h-3 w-1/2" />
    </div>
  </div>
</template>
