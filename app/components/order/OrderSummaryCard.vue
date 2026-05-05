<script setup lang="ts">
import type { CourseDetail, WebinarDetail } from '#shared/types/catalog'
import type { OrderEntityType } from '#shared/types/order'
import { formatDuration } from '~/utils/formatDuration'
import { formatPrice } from '~/utils/formatPrice'
import { formatScheduledDate } from '~/utils/formatScheduledDate'

type EntityDetail
  = | { type: 'course', value: CourseDetail }
    | { type: 'webinar', value: WebinarDetail }

interface Props {
  entityType: OrderEntityType
  course?: CourseDetail | null
  webinar?: WebinarDetail | null
}

const props = defineProps<Props>()
const { t } = useI18n()

const detail = computed<EntityDetail | null>(() => {
  if (props.entityType === 'course' && props.course) {
    return { type: 'course', value: props.course }
  }
  if (props.entityType === 'webinar' && props.webinar) {
    return { type: 'webinar', value: props.webinar }
  }
  return null
})

const title = computed(() => detail.value?.value.title ?? '')

const priceLabel = computed(() => {
  const d = detail.value
  if (!d) return ''
  return formatPrice(d.value.price, d.value.currency)
})

const instructorsLine = computed(() => {
  const list = detail.value?.value.instructors ?? []
  return list.map(i => i.display_name).filter(Boolean).join(', ')
})

const courseDurationLabel = computed(() => {
  if (detail.value?.type !== 'course') return ''
  return formatDuration(detail.value.value.duration_hours, {
    hours: t('landing.duration.hours_short'),
    minutes: t('landing.duration.minutes_short')
  })
})

const webinarScheduledLabel = computed(() => {
  if (detail.value?.type !== 'webinar') return ''
  const w = detail.value.value
  return formatScheduledDate(w.scheduled_start, w.status, {
    completedPrefix: t('catalog.card.completed_prefix')
  })
})

const entityLabel = computed(() =>
  props.entityType === 'course'
    ? t('checkout.summary.course_label')
    : t('checkout.summary.webinar_label')
)
</script>

<template>
  <UCard>
    <div class="space-y-4">
      <p class="text-xs uppercase tracking-wide text-muted">
        {{ entityLabel }}
      </p>

      <h2 class="text-xl font-medium leading-snug">
        {{ title }}
      </h2>

      <dl class="space-y-2 text-sm">
        <div
          v-if="instructorsLine"
          class="flex flex-wrap gap-x-2"
        >
          <dt class="text-muted">
            {{ t(detail?.value.instructors.length === 1 ? 'checkout.summary.instructor' : 'checkout.summary.instructors') }}:
          </dt>
          <dd>{{ instructorsLine }}</dd>
        </div>

        <div
          v-if="detail?.type === 'course' && courseDurationLabel"
          class="flex flex-wrap gap-x-2"
        >
          <dt class="text-muted">
            {{ t('checkout.summary.duration') }}:
          </dt>
          <dd>{{ courseDurationLabel }}</dd>
        </div>

        <div
          v-if="detail?.type === 'webinar' && webinarScheduledLabel"
          class="flex flex-wrap gap-x-2"
        >
          <dt class="text-muted">
            {{ t('checkout.summary.scheduled_start') }}:
          </dt>
          <dd>{{ webinarScheduledLabel }}</dd>
        </div>
      </dl>

      <div class="flex items-baseline justify-between border-t border-default pt-4">
        <span class="text-sm text-muted">
          {{ t('checkout.summary.price') }}
        </span>
        <span class="text-2xl font-semibold">
          {{ priceLabel }}
        </span>
      </div>
    </div>
  </UCard>
</template>
