<script setup lang="ts">
// Importing from `#components` makes the auto-import explicit. Without it
// the SSR pass through Reka UI's `<Primitive>` scope (used by UContainer)
// fails to resolve `<NuxtLink>` and renders a literal `<NuxtLink>` element.
import { NuxtLink } from '#components'

interface Props {
  /** When `true`, the wordmark is a `<NuxtLink>` to `/`. Defaults to `true`. */
  link?: boolean
  /** Tailwind size classes; the layouts override per slot. */
  size?: string
}
const { link = true, size = 'text-xl' } = defineProps<Props>()
</script>

<template>
  <NuxtLink
    v-if="link"
    to="/"
    :class="['inline-flex items-baseline gap-1.5 font-medium tracking-tight text-default', size]"
  >
    <span class="font-serif">Green Paws</span>
    <span class="text-muted text-[0.85em] uppercase tracking-[0.18em]">LMS</span>
  </NuxtLink>
  <span
    v-else
    :class="['inline-flex items-baseline gap-1.5 font-medium tracking-tight text-default', size]"
  >
    <span class="font-serif">Green Paws</span>
    <span class="text-muted text-[0.85em] uppercase tracking-[0.18em]">LMS</span>
  </span>
</template>
