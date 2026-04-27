<script setup lang="ts">
import type { DetailMaterial } from '#shared/types/catalog'
import { formatFileSize } from '~/utils/formatFileSize'

interface Props {
  materials: DetailMaterial[]
}

const props = defineProps<Props>()
const { t } = useI18n()

const hasMaterials = computed(() => props.materials.length > 0)
</script>

<template>
  <section
    v-if="hasMaterials"
    class="space-y-4"
  >
    <h2 class="text-2xl font-medium tracking-tight">
      {{ t('landing.webinar.section.materials') }}
    </h2>
    <ul class="space-y-2">
      <li
        v-for="material in materials"
        :key="material.url"
        class="flex items-center justify-between gap-4 rounded-md border border-default p-3"
      >
        <a
          :href="material.url"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-3 min-w-0 hover:text-primary"
        >
          <UIcon
            name="i-lucide-file-text"
            class="size-5 shrink-0 text-muted"
          />
          <span class="text-sm truncate">{{ material.name }}</span>
        </a>
        <span
          v-if="formatFileSize(material.size)"
          class="text-xs text-muted shrink-0 tabular-nums"
        >
          {{ formatFileSize(material.size) }}
        </span>
      </li>
    </ul>
  </section>
</template>
