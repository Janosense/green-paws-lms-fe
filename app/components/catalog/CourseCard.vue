<script setup lang="ts">
import type { CourseCardItem } from '#shared/types/catalog'
import { formatDuration } from '~/utils/formatDuration'
import { formatPrice } from '~/utils/formatPrice'

interface Props {
  course: CourseCardItem
}

const { course } = defineProps<Props>()
const { t } = useI18n()

const firstCategory = computed(() => course.categories[0] ?? null)
const initial = computed(() => course.title.trim().charAt(0).toUpperCase())
const duration = computed(() => formatDuration(course.duration_hours, {
  hours: t('catalog.card.duration_unit_hours'),
  minutes: t('catalog.card.duration_unit_minutes')
}))
const priceLabel = computed(() => {
  if (course.price <= 0) {
    return { value: t('catalog.card.free'), free: true }
  }
  return { value: formatPrice(course.price, course.currency), free: false }
})
</script>

<template>
  <NuxtLink
    :to="course.permalink"
    class="group flex flex-col gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary"
  >
    <CatalogCardCover
      :cover="course.cover"
      fallback-icon="i-lucide-book-open"
      :fallback-initial="initial"
    >
      <template
        v-if="firstCategory"
        #top-right
      >
        <UBadge
          color="neutral"
          variant="solid"
          size="sm"
        >
          {{ firstCategory.name }}
        </UBadge>
      </template>
    </CatalogCardCover>

    <h3 class="text-base font-medium leading-snug line-clamp-2 group-hover:text-primary">
      {{ course.title }}
    </h3>

    <div
      v-if="course.lead_instructor"
      class="flex items-center gap-2"
    >
      <UAvatar
        :src="course.lead_instructor.avatar.url"
        :alt="course.lead_instructor.display_name"
        size="2xs"
      />
      <span class="text-xs text-muted">
        {{ course.lead_instructor.display_name }}
      </span>
    </div>

    <p
      v-if="course.excerpt"
      class="text-sm text-muted line-clamp-2"
    >
      {{ course.excerpt }}
    </p>

    <div
      v-if="course.difficulty || duration"
      class="flex flex-wrap items-center gap-2"
    >
      <UBadge
        v-if="course.difficulty"
        color="neutral"
        variant="subtle"
        size="sm"
      >
        {{ course.difficulty.name }}
      </UBadge>
      <UBadge
        v-if="duration"
        color="neutral"
        variant="subtle"
        size="sm"
        icon="i-lucide-clock"
      >
        {{ duration }}
      </UBadge>
    </div>

    <p
      class="text-sm font-medium"
      :class="priceLabel.free ? 'text-muted' : 'text-default'"
    >
      {{ priceLabel.value }}
    </p>
  </NuxtLink>
</template>
