<script setup lang="ts">
import type { CatalogType } from '#shared/types/catalog'

interface Props {
  type: CatalogType
  category: { slug: string, name: string } | null
  title: string
}

const props = defineProps<Props>()
const { t } = useI18n()

const listingHref = computed(() => `/${props.type}`)
const categoryHref = computed(() =>
  props.category ? `/${props.type}?categories=${props.category.slug}` : ''
)
const listingLabel = computed(() => t(`landing.breadcrumbs.${props.type}`))
</script>

<template>
  <nav aria-label="Breadcrumb">
    <ol class="flex flex-wrap items-center gap-1.5 text-sm text-muted">
      <li>
        <NuxtLink
          to="/"
          class="hover:text-default"
        >
          {{ t('landing.breadcrumbs.home') }}
        </NuxtLink>
      </li>
      <li aria-hidden="true">
        ·
      </li>
      <li>
        <NuxtLink
          :to="listingHref"
          class="hover:text-default"
        >
          {{ listingLabel }}
        </NuxtLink>
      </li>
      <template v-if="category">
        <li aria-hidden="true">
          ·
        </li>
        <li>
          <NuxtLink
            :to="categoryHref"
            class="hover:text-default"
          >
            {{ category.name }}
          </NuxtLink>
        </li>
      </template>
      <li aria-hidden="true">
        ·
      </li>
      <li
        class="text-default truncate max-w-[40ch]"
        aria-current="page"
      >
        {{ title }}
      </li>
    </ol>
  </nav>
</template>
