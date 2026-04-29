<script setup lang="ts">
import type { ParagraphBlock } from '#shared/types/learn'

defineProps<{ block: ParagraphBlock }>()
</script>

<template>
  <!-- block.html is wp_kses_post'd server-side (5.1a contract) -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="text-[15px] leading-[1.6] text-default [&_a]:text-primary [&_a:hover]:underline [&_strong]:font-semibold [&_em]:italic [&_code]:font-mono [&_code]:text-sm [&_code]:px-1 [&_code]:py-0.5 [&_code]:bg-elevated [&_code]:rounded"
    v-html="block.html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
