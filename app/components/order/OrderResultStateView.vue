<script setup lang="ts">
import type { Order } from '#shared/types/order'

interface Props {
  order: Order
  /** True when the polling loop hit its 60s budget without seeing a terminal status. */
  timedOut?: boolean
}

const props = withDefaults(defineProps<Props>(), { timedOut: false })
const { t } = useI18n()

const checkoutPath = computed(
  () => `/checkout/${props.order.entity_slug}?type=${props.order.entity_type}`
)
const entityPath = computed(() => {
  if (props.order.entity_type === 'course') {
    return `/courses/${props.order.entity_slug}`
  }
  return `/webinars/${props.order.entity_slug}`
})
const enrolledEntityPath = computed(() => {
  if (props.order.entity_type === 'course') {
    return `/courses/${props.order.entity_slug}`
  }
  return `/dashboard/webinars/${props.order.entity_slug}`
})

const isProcessing = computed(() =>
  props.order.status === 'pending' || props.order.status === 'awaiting_payment'
)
</script>

<template>
  <section class="space-y-6 text-center">
    <!-- Polling timeout: pending/awaiting_payment + timed out -->
    <template v-if="isProcessing && timedOut">
      <UIcon
        name="i-lucide-clock"
        class="size-12 mx-auto text-muted"
      />
      <h1 class="text-2xl font-medium">
        {{ t('checkout.result.processing.title') }}
      </h1>
      <p class="text-muted">
        {{ t('checkout.result.processing.timeout') }}
      </p>
      <UButton
        to="/dashboard/orders"
        color="primary"
      >
        {{ t('checkout.result.processing.go_to_orders') }}
      </UButton>
    </template>

    <!-- Still polling -->
    <template v-else-if="isProcessing">
      <UIcon
        name="i-lucide-loader-circle"
        class="size-12 mx-auto text-primary animate-spin"
      />
      <h1 class="text-2xl font-medium">
        {{ t('checkout.result.processing.title') }}
      </h1>
      <p class="text-muted">
        {{ t('checkout.result.processing.subtitle') }}
      </p>
    </template>

    <template v-else-if="order.status === 'paid'">
      <UIcon
        name="i-lucide-check-circle-2"
        class="size-12 mx-auto text-success"
      />
      <h1 class="text-2xl font-medium">
        {{ t(`checkout.result.paid.title.${order.entity_type}`) }}
      </h1>
      <p class="text-muted">
        {{ t(`checkout.result.paid.subtitle.${order.entity_type}`) }}
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <UButton
          :to="enrolledEntityPath"
          color="primary"
          size="lg"
        >
          {{ t(`checkout.result.paid.cta.${order.entity_type}`) }}
        </UButton>
        <UButton
          to="/dashboard/orders"
          color="neutral"
          variant="ghost"
        >
          {{ t('checkout.result.paid.cta.dashboard') }}
        </UButton>
      </div>
    </template>

    <template v-else-if="order.status === 'failed'">
      <UIcon
        name="i-lucide-alert-triangle"
        class="size-12 mx-auto text-error"
      />
      <h1 class="text-2xl font-medium">
        {{ t('checkout.result.failed.title') }}
      </h1>
      <p class="text-muted">
        {{ t('checkout.result.failed.subtitle') }}
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <UButton
          :to="checkoutPath"
          color="primary"
        >
          {{ t('checkout.result.failed.cta_retry') }}
        </UButton>
        <UButton
          :to="entityPath"
          color="neutral"
          variant="ghost"
        >
          {{ t('checkout.result.failed.cta_back') }}
        </UButton>
      </div>
    </template>

    <template v-else-if="order.status === 'cancelled'">
      <UIcon
        name="i-lucide-x-circle"
        class="size-12 mx-auto text-muted"
      />
      <h1 class="text-2xl font-medium">
        {{ t('checkout.result.cancelled.title') }}
      </h1>
      <p class="text-muted">
        {{ t('checkout.result.cancelled.subtitle') }}
      </p>
      <UButton
        :to="entityPath"
        color="neutral"
        variant="ghost"
      >
        {{ t('checkout.result.cancelled.cta_back') }}
      </UButton>
    </template>

    <template v-else-if="order.status === 'expired'">
      <UIcon
        name="i-lucide-clock"
        class="size-12 mx-auto text-muted"
      />
      <h1 class="text-2xl font-medium">
        {{ t('checkout.result.expired.title') }}
      </h1>
      <p class="text-muted">
        {{ t('checkout.result.expired.subtitle') }}
      </p>
      <UButton
        :to="checkoutPath"
        color="primary"
      >
        {{ t('checkout.result.expired.cta_new') }}
      </UButton>
    </template>

    <template v-else-if="order.status === 'refunded'">
      <UIcon
        name="i-lucide-rotate-ccw"
        class="size-12 mx-auto text-warning"
      />
      <h1 class="text-2xl font-medium">
        {{ t('checkout.result.refunded.title') }}
      </h1>
      <p class="text-muted">
        {{ t('checkout.result.refunded.subtitle') }}
      </p>
      <UButton
        :to="entityPath"
        color="neutral"
        variant="ghost"
      >
        {{ t('checkout.result.refunded.cta_back') }}
      </UButton>
    </template>
  </section>
</template>
