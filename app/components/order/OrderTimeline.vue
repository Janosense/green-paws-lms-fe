<script setup lang="ts">
import type { Order } from '#shared/types/order'
import { formatInSourceOffset } from '~/utils/formatInSourceOffset'

interface Props {
  order: Order
}

const props = defineProps<Props>()
const { t } = useI18n()

interface TimelineEntry {
  key: string
  labelKey: string
  iconName: string
  iconColor: 'primary' | 'success' | 'warning' | 'neutral' | 'error'
  timestamp: string
}

function formatDateTime(value: string): string {
  return formatInSourceOffset(value, 'uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) ?? value
}

const entries = computed<TimelineEntry[]>(() => {
  const result: TimelineEntry[] = []
  const order = props.order

  if (order.created_at) {
    result.push({
      key: 'created',
      labelKey: 'order.timeline.created',
      iconName: 'i-lucide-circle-plus',
      iconColor: 'neutral',
      timestamp: order.created_at
    })
  }
  if (order.paid_at) {
    result.push({
      key: 'paid',
      labelKey: 'order.timeline.paid',
      iconName: 'i-lucide-check-circle',
      iconColor: 'success',
      timestamp: order.paid_at
    })
  }
  if (order.cancelled_at) {
    result.push({
      key: 'cancelled',
      labelKey: 'order.timeline.cancelled',
      iconName: 'i-lucide-x-circle',
      iconColor: 'neutral',
      timestamp: order.cancelled_at
    })
  }
  if (order.status === 'expired' && order.expires_at) {
    result.push({
      key: 'expired',
      labelKey: 'order.timeline.expired',
      iconName: 'i-lucide-clock',
      iconColor: 'neutral',
      timestamp: order.expires_at
    })
  }
  if (order.refunded_at) {
    result.push({
      key: 'refunded',
      labelKey: 'order.timeline.refunded',
      iconName: 'i-lucide-rotate-ccw',
      iconColor: 'warning',
      timestamp: order.refunded_at
    })
  }
  if (order.status === 'failed' && !order.cancelled_at) {
    // Only surface "failed" when there is no cancellation timestamp; the
    // backend uses `cancelled_at` as the terminal-state timestamp for both
    // cancelled and failed states historically. Leave room for future
    // dedicated `failed_at` if it lands.
    result.push({
      key: 'failed',
      labelKey: 'order.timeline.failed',
      iconName: 'i-lucide-alert-triangle',
      iconColor: 'error',
      timestamp: order.created_at
    })
  }

  return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
})
</script>

<template>
  <section
    v-if="entries.length > 0"
    class="space-y-4"
  >
    <h2 class="text-lg font-medium">
      {{ t('order.timeline.title') }}
    </h2>
    <ol class="space-y-3 border-l border-default pl-5">
      <li
        v-for="entry in entries"
        :key="entry.key"
        class="relative"
      >
        <span
          class="absolute -left-[27px] flex size-5 items-center justify-center rounded-full bg-default border border-default"
        >
          <UIcon
            :name="entry.iconName"
            class="size-3"
            :class="`text-${entry.iconColor}`"
          />
        </span>
        <p class="text-sm font-medium">
          {{ t(entry.labelKey) }}
        </p>
        <p class="text-xs text-muted">
          {{ formatDateTime(entry.timestamp) }}
        </p>
      </li>
    </ol>
  </section>
</template>
