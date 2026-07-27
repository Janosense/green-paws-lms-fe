<script setup lang="ts">
import type { TableBlock } from '#shared/types/learn'

defineProps<{ block: TableBlock }>()
</script>

<template>
  <!-- Cell HTML is wp_kses_post'd server-side (5.1a contract) -->
  <!-- eslint-disable vue/no-v-html -->
  <div class="my-2 overflow-x-auto rounded-lg border border-default">
    <table class="w-full text-sm border-collapse">
      <thead v-if="block.has_header && block.head.length">
        <tr
          v-for="(row, ri) in block.head"
          :key="`h-${ri}`"
          class="bg-elevated border-b border-default"
        >
          <th
            v-for="(cell, ci) in row"
            :key="`h-${ri}-${ci}`"
            class="vl-rich-text px-4 py-2 text-start font-medium text-default"
            v-html="cell"
          />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, ri) in block.body"
          :key="`b-${ri}`"
          class="border-b border-default last:border-b-0"
        >
          <td
            v-for="(cell, ci) in row"
            :key="`b-${ri}-${ci}`"
            class="vl-rich-text px-4 py-2 align-top"
            v-html="cell"
          />
        </tr>
      </tbody>
      <tfoot v-if="block.has_footer && block.foot.length">
        <tr
          v-for="(row, ri) in block.foot"
          :key="`f-${ri}`"
          class="border-t border-default bg-elevated"
        >
          <td
            v-for="(cell, ci) in row"
            :key="`f-${ri}-${ci}`"
            class="vl-rich-text px-4 py-2 text-muted"
            v-html="cell"
          />
        </tr>
      </tfoot>
    </table>
  </div>
  <!-- eslint-enable vue/no-v-html -->
</template>
