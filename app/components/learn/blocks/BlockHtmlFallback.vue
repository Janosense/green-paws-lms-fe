<script setup lang="ts">
import type { HtmlFallbackBlock } from '#shared/types/learn'

defineProps<{ block: HtmlFallbackBlock }>()
</script>

<template>
  <!-- block.html is wp_kses_post'd server-side (5.1a contract) -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="text-[15px] leading-[1.6] text-default [&_a]:text-primary [&_a:hover]:underline [&_strong]:font-semibold [&_em]:italic"
    v-html="block.html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
