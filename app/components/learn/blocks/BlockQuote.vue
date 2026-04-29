<script setup lang="ts">
import type { QuoteBlock } from '#shared/types/learn'

defineProps<{ block: QuoteBlock }>()
</script>

<template>
  <!-- block.html and block.citation are wp_kses_post'd server-side (5.1a contract) -->
  <!-- eslint-disable vue/no-v-html -->
  <blockquote class="border-s-4 border-brand-200 dark:border-brand-700 ps-5 py-1 my-2 font-serif">
    <div
      class="text-lg italic text-default [&_a]:text-primary [&_a:hover]:underline"
      v-html="block.html"
    />
    <footer
      v-if="block.citation"
      class="mt-2 text-sm text-muted not-italic font-sans"
    >
      — <span v-html="block.citation" />
    </footer>
  </blockquote>
  <!-- eslint-enable vue/no-v-html -->
</template>
