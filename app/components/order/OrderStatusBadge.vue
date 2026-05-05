<script setup lang="ts">
import type { OrderStatus } from '#shared/types/order'

interface Props {
  status: OrderStatus
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), { size: 'sm' })
const { t } = useI18n()

type BadgeColor = 'primary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

const COLOR_BY_STATUS: Record<OrderStatus, BadgeColor> = {
  pending: 'info',
  awaiting_payment: 'info',
  paid: 'success',
  failed: 'neutral',
  cancelled: 'neutral',
  expired: 'neutral',
  refunded: 'warning'
}

const color = computed<BadgeColor>(() => COLOR_BY_STATUS[props.status])
const label = computed(() => t(`order.status.${props.status}`))
</script>

<template>
  <UBadge
    :color="color"
    variant="subtle"
    :size="size"
  >
    {{ label }}
  </UBadge>
</template>
