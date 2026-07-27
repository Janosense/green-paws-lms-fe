<script setup lang="ts">
import type { ImageBlock } from '#shared/types/learn'

defineProps<{ block: ImageBlock }>()

const { t } = useI18n()
</script>

<template>
  <figure class="my-2">
    <NuxtImg
      :src="block.url"
      :alt="block.alt || t('learn.block.image.fallback_alt')"
      :width="block.width ?? undefined"
      :height="block.height ?? undefined"
      sizes="sm:100vw md:90vw lg:800px"
      loading="lazy"
      decoding="async"
      class="w-full h-auto rounded-lg border border-default"
    />
    <!-- Caption HTML is wp_kses_post'd server-side (5.1a contract) -->
    <!-- eslint-disable vue/no-v-html -->
    <figcaption
      v-if="block.caption"
      class="vl-rich-text mt-2 text-sm text-muted text-center"
      v-html="block.caption"
    />
    <!-- eslint-enable vue/no-v-html -->
  </figure>
</template>
