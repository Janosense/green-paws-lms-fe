<script setup lang="ts">
import type { FileBlock } from '#shared/types/learn'
import { formatFileSize } from '~/utils/formatFileSize'

defineProps<{ block: FileBlock }>()

const { t } = useI18n()
</script>

<template>
  <UCard
    class="my-2"
    :ui="{ body: 'p-4 sm:p-4' }"
  >
    <div class="flex items-center gap-3">
      <UIcon
        name="i-lucide-file-down"
        class="text-2xl text-primary shrink-0"
      />
      <div class="flex-1 min-w-0">
        <a
          :href="block.url"
          target="_blank"
          rel="noopener noreferrer"
          class="block text-default font-medium hover:text-primary truncate"
        >
          {{ block.name }}
        </a>
        <p
          v-if="block.size"
          class="text-xs text-muted"
        >
          {{ formatFileSize(block.size) }}
        </p>
      </div>
      <UButton
        :to="block.url"
        external
        target="_blank"
        rel="noopener noreferrer"
        icon="i-lucide-download"
        size="sm"
        color="primary"
        variant="soft"
      >
        {{ t('learn.block.file.download') }}
      </UButton>
    </div>
  </UCard>
</template>
