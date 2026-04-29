<script setup lang="ts">
import type { EmbedBlock } from '#shared/types/learn'

const props = defineProps<{ block: EmbedBlock }>()

const { t } = useI18n()

const providerLabel = computed(() => {
  switch (props.block.provider) {
    case 'vimeo': return 'Vimeo'
    case 'youtube': return 'YouTube'
    default: return t('learn.block.embed.provider_other')
  }
})
</script>

<template>
  <div class="my-2">
    <div
      v-if="block.embed_url"
      class="aspect-video bg-elevated rounded-lg overflow-hidden border border-default"
    >
      <iframe
        :src="block.embed_url"
        :title="t('learn.block.embed.iframe_title', { provider: providerLabel })"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowfullscreen
        class="w-full h-full border-0"
      />
    </div>
    <div
      v-else
      class="rounded-lg border border-default bg-elevated p-4"
    >
      <p class="text-sm text-muted mb-1">
        {{ t('learn.block.embed.fallback_label') }}
      </p>
      <a
        :href="block.url"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary hover:underline break-all text-sm"
      >
        {{ block.url }}
      </a>
    </div>
  </div>
</template>
