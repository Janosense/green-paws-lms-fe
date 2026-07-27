<script setup lang="ts">
import type { ListBlock } from '#shared/types/learn'

defineProps<{ block: ListBlock }>()
</script>

<template>
  <!--
    The wrapper — not the list — carries `.vl-rich-text`, so the outer list
    and any list nested inside an item are both descendants of it and pick
    up markers, indent and the per-level marker step from one shared rule
    set. Styling the <ul> directly would leave nested lists unmatched.
  -->
  <div class="vl-rich-text text-[15px] leading-[1.6] text-default">
    <component :is="block.ordered ? 'ol' : 'ul'">
      <!-- Item HTML is wp_kses_post'd server-side (5.1a contract) -->
      <!-- eslint-disable vue/no-v-html -->
      <li
        v-for="(itemHtml, i) in block.items"
        :key="i"
        v-html="itemHtml"
      />
      <!-- eslint-enable vue/no-v-html -->
    </component>
  </div>
</template>
