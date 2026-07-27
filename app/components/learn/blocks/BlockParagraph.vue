<script setup lang="ts">
import type { ParagraphBlock } from '#shared/types/learn'

defineProps<{ block: ParagraphBlock }>()
</script>

<template>
  <!-- block.html is wp_kses_post'd server-side (5.1a contract) -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="vl-rich-text text-[15px] leading-[1.6] text-default"
    v-html="block.html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
