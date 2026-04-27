<script setup lang="ts">
// WebinarHero mirrors CourseHero with date/status semantics. The "Через
// N днів" line is computed once on render — by design, no live countdown
// (Phase 3.4 explicitly rejects it). SWR cache absorbs the small drift
// between SSR and hydration.

import type { WebinarDetail, WebinarStatus } from '#shared/types/catalog'
import { formatPrice } from '~/utils/formatPrice'
import { formatRelativeDate } from '~/utils/formatRelativeDate'
import { formatScheduledDate } from '~/utils/formatScheduledDate'

interface Props {
  webinar: WebinarDetail
  isAuthed: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'cta-click': []
}>()

const { t } = useI18n()

const STATUS_COLORS: Record<WebinarStatus, 'primary' | 'error' | 'neutral'> = {
  scheduled: 'primary',
  live: 'error',
  completed: 'neutral',
  cancelled: 'neutral'
}

const initial = computed(() => props.webinar.title.trim().charAt(0).toUpperCase())

const dateLine = computed(() => formatScheduledDate(
  props.webinar.scheduled_start,
  props.webinar.status,
  { completedPrefix: t('catalog.card.completed_prefix') }
))

const relativeLine = computed(() => formatRelativeDate(
  props.webinar.scheduled_start,
  new Date(),
  {
    today: t('landing.relative_date.today'),
    tomorrow: t('landing.relative_date.tomorrow'),
    daysFuture: days => t('landing.relative_date.days_future', { days }),
    daysPast: days => t('landing.relative_date.days_past', { days })
  }
))

const statusLabel = computed(() => t(`catalog.card.webinar_status.${props.webinar.status}`))

const priceLabel = computed(() => {
  if (props.webinar.price <= 0) {
    return { value: t('catalog.card.free'), free: true }
  }
  return { value: formatPrice(props.webinar.price, props.webinar.currency), free: false }
})

interface CtaState {
  label: string
  disabled: boolean
}

const cta = computed<CtaState>(() => {
  if (props.webinar.status === 'completed') {
    return { label: t('landing.webinar.cta.completed'), disabled: true }
  }
  if (props.webinar.status === 'cancelled') {
    return { label: t('landing.webinar.cta.cancelled'), disabled: true }
  }
  if (props.webinar.status === 'live') {
    return { label: t('landing.webinar.cta.live'), disabled: true }
  }
  if (!props.webinar.registration_open) {
    return { label: t('landing.webinar.cta.closed'), disabled: true }
  }
  return { label: t('landing.webinar.cta.register'), disabled: false }
})

function onCtaClick() {
  if (!cta.value.disabled) {
    emit('cta-click')
  }
}
</script>

<template>
  <section class="grid gap-8 lg:grid-cols-2 lg:gap-x-12 lg:items-center">
    <div class="space-y-6">
      <CatalogBreadcrumbs
        type="webinars"
        :category="webinar.categories[0] ?? null"
        :title="webinar.title"
      />

      <h1 class="text-4xl lg:text-5xl font-medium tracking-tight leading-tight">
        {{ webinar.title }}
      </h1>

      <p
        v-if="webinar.excerpt"
        class="text-lg text-muted leading-relaxed line-clamp-3"
      >
        {{ webinar.excerpt }}
      </p>

      <div class="flex flex-wrap items-center gap-2">
        <UBadge
          :color="STATUS_COLORS[webinar.status]"
          variant="solid"
          size="md"
        >
          {{ statusLabel }}
        </UBadge>
        <UBadge
          v-if="webinar.categories[0]"
          color="neutral"
          variant="subtle"
          size="md"
        >
          {{ webinar.categories[0].name }}
        </UBadge>
        <UBadge
          v-if="webinar.recording_offered"
          color="neutral"
          variant="subtle"
          size="md"
          icon="i-lucide-video"
        >
          {{ t('landing.webinar.recording_badge', { days: webinar.recording_access_days }) }}
        </UBadge>
      </div>

      <div class="space-y-3 pt-2">
        <p
          v-if="dateLine"
          class="text-2xl font-semibold text-default"
        >
          {{ dateLine }}
        </p>
        <p
          v-if="relativeLine"
          class="text-sm text-muted"
        >
          {{ relativeLine }}
        </p>
        <p
          class="text-2xl font-semibold"
          :class="priceLabel.free ? 'text-muted' : 'text-default'"
        >
          {{ priceLabel.value }}
        </p>
        <UButton
          color="primary"
          size="xl"
          :disabled="cta.disabled"
          icon="i-lucide-calendar-plus"
          @click="onCtaClick"
        >
          {{ cta.label }}
        </UButton>
      </div>
    </div>

    <div class="lg:col-start-2">
      <CatalogCardCover
        :cover="webinar.cover"
        fallback-icon="i-lucide-radio"
        :fallback-initial="initial"
      />
    </div>
  </section>
</template>
