<script setup lang="ts">
import type { Order } from '#shared/types/order'
import { resolveOrderError } from '~/utils/resolveOrderError'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { t } = useI18n()
useHead({
  title: () => t('order.title.list'),
  meta: [{ name: 'robots', content: 'noindex,follow' }]
})

const store = useOrdersStore()

if (!store.initialized) {
  await store.init()
}

type FilterValue = 'all' | 'active' | 'paid' | 'cancelled' | 'expired'
const filter = ref<FilterValue>('all')

const filterOptions = computed(() => [
  { label: t('order.filter.all'), value: 'all' as const },
  { label: t('order.filter.active'), value: 'active' as const },
  { label: t('order.filter.paid'), value: 'paid' as const },
  { label: t('order.filter.cancelled'), value: 'cancelled' as const },
  { label: t('order.filter.expired'), value: 'expired' as const }
])

const filteredOrders = computed<Order[]>(() => {
  switch (filter.value) {
    case 'active': return store.activeOrders
    case 'paid': return store.paidOrders
    case 'cancelled': return store.cancelledOrders
    case 'expired': return store.expiredOrders
    default: return store.items
  }
})

const isInitialLoading = computed(() => !store.initialized && store.status === 'loading')
const showError = computed(() => store.status === 'error')
const showEmpty = computed(() =>
  store.initialized && !showError.value && store.items.length === 0
)
const showFilteredEmpty = computed(() =>
  store.initialized && !showError.value && store.items.length > 0 && filteredOrders.value.length === 0
)

const errorKey = computed(() => resolveOrderError(store.error).key)
</script>

<template>
  <UContainer class="py-10">
    <div class="space-y-6">
      <div class="flex flex-wrap items-baseline justify-between gap-4">
        <h1 class="text-3xl font-medium tracking-tight">
          {{ t('order.title.list') }}
        </h1>
        <USelect
          v-if="store.items.length > 0"
          v-model="filter"
          :items="filterOptions"
          value-key="value"
        />
      </div>

      <LoadingSkeleton
        v-if="isInitialLoading"
        variant="card"
        :count="3"
      />

      <ErrorState
        v-else-if="showError"
        icon="i-lucide-alert-triangle"
        :title="t('common.error_title')"
        :description="t(errorKey)"
      >
        <UButton
          color="primary"
          icon="i-lucide-rotate-ccw"
          @click="store.refreshList()"
        >
          {{ t('common.try_again') }}
        </UButton>
      </ErrorState>

      <EmptyState
        v-else-if="showEmpty"
        icon="i-lucide-receipt"
        :title="t('order.empty.title')"
        :description="t('order.empty.description')"
      >
        <UButton
          to="/courses"
          color="primary"
        >
          {{ t('order.empty.cta') }}
        </UButton>
      </EmptyState>

      <p
        v-else-if="showFilteredEmpty"
        class="text-sm text-muted"
      >
        {{ t('order.empty.title') }}
      </p>

      <div
        v-else
        class="space-y-3"
      >
        <OrderListRow
          v-for="order in filteredOrders"
          :key="order.uuid"
          :order="order"
        />
      </div>
    </div>
  </UContainer>
</template>
