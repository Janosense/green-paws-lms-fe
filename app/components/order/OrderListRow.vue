<script setup lang="ts">
import type { Order } from '#shared/types/order'
import { formatInSourceOffset } from '~/utils/formatInSourceOffset'
import { formatPrice } from '~/utils/formatPrice'

interface Props {
  order: Order
}

const props = defineProps<Props>()
const { t } = useI18n()

const detailPath = computed(() => `/dashboard/orders/${props.order.uuid}`)

const priceLabel = computed(() => {
  const major = Number(props.order.amount.major)
  if (Number.isNaN(major)) {
    return `${props.order.amount.major} ${props.order.amount.currency}`
  }
  return formatPrice(major, props.order.amount.currency)
})

const createdLabel = computed(() =>
  formatInSourceOffset(props.order.created_at, 'uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) ?? ''
)

const entityTypeLabel = computed(() => t(`order.entity_type.${props.order.entity_type}`))
</script>

<template>
  <NuxtLink
    :to="detailPath"
    class="block group"
  >
    <UCard class="transition-colors group-hover:border-primary">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0 flex-1 space-y-1">
          <p class="text-xs text-muted">
            {{ entityTypeLabel }}
          </p>
          <h3 class="text-base font-medium leading-snug line-clamp-1">
            {{ order.entity_title_snapshot }}
          </h3>
          <p
            v-if="createdLabel"
            class="text-xs text-muted"
          >
            {{ createdLabel }}
          </p>
        </div>

        <div class="flex items-center gap-4">
          <p class="text-base font-semibold whitespace-nowrap">
            {{ priceLabel }}
          </p>
          <OrderStatusBadge :status="order.status" />
          <UIcon
            name="i-lucide-chevron-right"
            class="text-muted"
          />
        </div>
      </div>
    </UCard>
  </NuxtLink>
</template>
