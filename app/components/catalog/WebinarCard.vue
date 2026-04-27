<script setup lang="ts">
import type { WebinarCardItem, WebinarStatus } from '#shared/types/catalog'
import { formatPrice } from '~/utils/formatPrice'
import { formatScheduledDate } from '~/utils/formatScheduledDate'

interface Props {
  webinar: WebinarCardItem
}

const { webinar } = defineProps<Props>()
const { t } = useI18n()

const STATUS_COLORS: Record<WebinarStatus, 'primary' | 'error' | 'neutral'> = {
  scheduled: 'primary',
  live: 'error',
  completed: 'neutral',
  cancelled: 'neutral'
}

const firstCategory = computed(() => webinar.categories[0] ?? null)
const initial = computed(() => webinar.title.trim().charAt(0).toUpperCase())
const scheduled = computed(() => formatScheduledDate(
  webinar.scheduled_start,
  webinar.status,
  { completedPrefix: t('catalog.card.completed_prefix') }
))
const statusLabel = computed(() => t(`catalog.card.webinar_status.${webinar.status}`))
const priceLabel = computed(() => {
  if (webinar.price <= 0) {
    return { value: t('catalog.card.free'), free: true }
  }
  return { value: formatPrice(webinar.price, webinar.currency), free: false }
})
</script>

<template>
  <NuxtLink
    :to="webinar.permalink"
    class="group flex flex-col gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary"
  >
    <CatalogCardCover
      :cover="webinar.cover"
      fallback-icon="i-lucide-radio"
      :fallback-initial="initial"
    >
      <template #top-right>
        <UBadge
          :color="STATUS_COLORS[webinar.status]"
          variant="solid"
          size="sm"
        >
          {{ statusLabel }}
        </UBadge>
      </template>
    </CatalogCardCover>

    <h3
      class="text-base font-medium leading-snug line-clamp-2 group-hover:text-primary"
      :class="webinar.status === 'cancelled' ? 'line-through text-muted' : ''"
    >
      {{ webinar.title }}
    </h3>

    <div
      v-if="webinar.lead_instructor"
      class="flex items-center gap-2"
    >
      <UAvatar
        :src="webinar.lead_instructor.avatar.url"
        :alt="webinar.lead_instructor.display_name"
        size="2xs"
      />
      <span class="text-xs text-muted">
        {{ webinar.lead_instructor.display_name }}
      </span>
    </div>

    <p
      v-if="webinar.excerpt"
      class="text-sm text-muted line-clamp-2"
    >
      {{ webinar.excerpt }}
    </p>

    <div
      v-if="webinar.difficulty || firstCategory || scheduled"
      class="flex flex-wrap items-center gap-2"
    >
      <UBadge
        v-if="scheduled"
        color="neutral"
        variant="subtle"
        size="sm"
        icon="i-lucide-calendar"
      >
        {{ scheduled }}
      </UBadge>
      <UBadge
        v-if="firstCategory"
        color="neutral"
        variant="subtle"
        size="sm"
      >
        {{ firstCategory.name }}
      </UBadge>
      <UBadge
        v-if="webinar.difficulty"
        color="neutral"
        variant="subtle"
        size="sm"
      >
        {{ webinar.difficulty.name }}
      </UBadge>
    </div>

    <div class="space-y-1">
      <p
        class="text-sm font-medium"
        :class="priceLabel.free ? 'text-muted' : 'text-default'"
      >
        {{ priceLabel.value }}
      </p>
      <p
        v-if="!webinar.registration_open"
        class="text-xs text-muted"
      >
        {{ t('catalog.card.registration_closed') }}
      </p>
    </div>
  </NuxtLink>
</template>
