<script setup lang="ts">
import type { CodeBlock } from '#shared/types/learn'

defineProps<{ block: CodeBlock }>()
</script>

<template>
  <div class="rounded-lg border border-default bg-elevated overflow-hidden my-2">
    <div
      v-if="block.language"
      class="px-4 py-2 border-b border-default bg-default"
    >
      <span class="text-xs font-mono text-muted uppercase tracking-wider">{{ block.language }}</span>
    </div>
    <pre class="p-4 overflow-x-auto"><code class="font-mono text-sm leading-relaxed">{{ block.code }}</code></pre>
  </div>
</template>
