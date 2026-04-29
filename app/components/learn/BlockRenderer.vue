<script setup lang="ts">
// Phase 5.4b — block dispatcher.
// Prose typography: Option A (utility-only, no @tailwindcss/typography plugin).
// Per-block components own their own classes; the parent controls vertical rhythm
// via space-y-6 and an optional reading-width cap is applied by the page.
//
// Dispatch strategy: v-if ladder over block.type. Verbose, but each branch fully
// narrows the discriminated union so child props stay strictly typed without a
// runtime <component :is> cast.

import type { ContentBlock } from '#shared/types/learn'

defineProps<{ blocks: ContentBlock[] }>()

const KNOWN_TYPES: ReadonlySet<ContentBlock['type']> = new Set([
  'paragraph',
  'heading',
  'list',
  'image',
  'quote',
  'embed',
  'separator',
  'code',
  'table',
  'file',
  'html'
])

function isKnown(block: ContentBlock): boolean {
  if (!KNOWN_TYPES.has(block.type)) {
    if (import.meta.dev) {
      console.warn('[BlockRenderer] unknown block type, skipping:', block)
    }
    return false
  }
  return true
}
</script>

<template>
  <div class="space-y-6">
    <template
      v-for="(block, index) in blocks"
      :key="index"
    >
      <template v-if="isKnown(block)">
        <BlockParagraph
          v-if="block.type === 'paragraph'"
          :block="block"
        />
        <BlockHeading
          v-else-if="block.type === 'heading'"
          :block="block"
        />
        <BlockList
          v-else-if="block.type === 'list'"
          :block="block"
        />
        <BlockImage
          v-else-if="block.type === 'image'"
          :block="block"
        />
        <BlockQuote
          v-else-if="block.type === 'quote'"
          :block="block"
        />
        <BlockEmbed
          v-else-if="block.type === 'embed'"
          :block="block"
        />
        <BlockSeparator v-else-if="block.type === 'separator'" />
        <BlockCode
          v-else-if="block.type === 'code'"
          :block="block"
        />
        <BlockTable
          v-else-if="block.type === 'table'"
          :block="block"
        />
        <BlockFile
          v-else-if="block.type === 'file'"
          :block="block"
        />
        <BlockHtmlFallback
          v-else-if="block.type === 'html'"
          :block="block"
        />
      </template>
    </template>
  </div>
</template>
