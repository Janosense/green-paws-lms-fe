<script setup lang="ts">
import type { HtmlFallbackBlock } from '#shared/types/learn'

defineProps<{ block: HtmlFallbackBlock }>()
</script>

<template>
  <!-- block.html is wp_kses_post'd server-side (5.1a contract) -->
  <!--
    Carries whole documents, not fragments: `vl_lesson` / `vl_topic` are
    registered with `show_in_rest => false`, so wp-admin serves them the
    classic editor and the whole post arrives as one unnamed freeform
    block. `.vl-rich-text` is what gives that markup its headings, list
    markers and paragraph spacing — see app/assets/css/main.css.
  -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="vl-rich-text text-[15px] leading-[1.6] text-default"
    v-html="block.html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
