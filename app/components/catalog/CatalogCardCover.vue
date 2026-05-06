<script setup lang="ts">
import type { CardCover } from '#shared/types/catalog'

interface Props {
  cover: CardCover | null
  fallbackIcon: string
  fallbackInitial: string
  loading?: 'lazy' | 'eager'
  sizes?: string
}

const {
  cover,
  fallbackIcon,
  fallbackInitial,
  loading = 'lazy',
  sizes = 'sm:100vw md:50vw lg:33vw'
} = defineProps<Props>()

const resolvedSize = computed(() => cover?.card ?? cover?.full ?? cover?.thumbnail)
</script>

<template>
  <div class="relative aspect-video w-full overflow-hidden rounded-md bg-elevated">
    <NuxtImg
      v-if="resolvedSize"
      :src="resolvedSize.url"
      :width="resolvedSize.width"
      :height="resolvedSize.height"
      :loading="loading"
      :sizes="sizes"
      format="webp"
      alt=""
      class="h-full w-full object-cover"
    />
    <div
      v-else
      class="flex h-full w-full items-center justify-center bg-primary-50 dark:bg-primary-950/40"
    >
      <span
        v-if="fallbackInitial"
        class="text-3xl font-medium text-muted"
      >
        {{ fallbackInitial }}
      </span>
      <UIcon
        v-else
        :name="fallbackIcon"
        class="size-10 text-muted"
      />
    </div>
    <div
      v-if="$slots['top-right']"
      class="absolute right-2 top-2"
    >
      <slot name="top-right" />
    </div>
  </div>
</template>
