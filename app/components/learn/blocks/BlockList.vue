<script setup lang="ts">
import type { ListBlock } from '#shared/types/learn'

defineProps<{ block: ListBlock }>()
</script>

<template>
  <component
    :is="block.ordered ? 'ol' : 'ul'"
    class="list-outside ps-6 space-y-2 text-[15px] leading-[1.6] text-default marker:text-muted [&_a]:text-primary [&_a:hover]:underline"
    :class="block.ordered ? 'list-decimal' : 'list-disc'"
  >
    <!-- Item HTML is wp_kses_post'd server-side (5.1a contract) -->
    <!-- eslint-disable vue/no-v-html -->
    <li
      v-for="(itemHtml, i) in block.items"
      :key="i"
      v-html="itemHtml"
    />
    <!-- eslint-enable vue/no-v-html -->
  </component>
</template>
