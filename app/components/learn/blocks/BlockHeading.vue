<script setup lang="ts">
import type { HeadingBlock } from '#shared/types/learn'

const props = defineProps<{ block: HeadingBlock }>()

const headingClass = computed(() => {
  switch (props.block.level) {
    case 2: return 'text-2xl mt-8'
    case 3: return 'text-xl mt-6'
    case 4: return 'text-lg mt-6'
    case 5: return 'text-base mt-4'
    case 6: return 'text-sm mt-4 text-muted'
    default: return 'text-base mt-4'
  }
})

const tag = computed(() => `h${props.block.level}` as const)
</script>

<template>
  <component
    :is="tag"
    :id="block.anchor ?? undefined"
    class="font-medium tracking-tight text-default scroll-mt-20"
    :class="headingClass"
  >
    {{ block.text }}
  </component>
</template>
