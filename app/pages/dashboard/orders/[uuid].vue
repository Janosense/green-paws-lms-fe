<script setup lang="ts">
import { resolveOrderError } from '~/utils/resolveOrderError'
import { formatPrice } from '~/utils/formatPrice'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const route = useRoute()
const { t } = useI18n()
const store = useOrdersStore()

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const uuid = computed(() => String(route.params.uuid ?? ''))

if (!UUID_RE.test(uuid.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Invalid order id', fatal: true })
}

const loading = ref(true)
const errorKey = ref<string | null>(null)
const refreshing = ref(false)

const order = computed(() => store.getOrder(uuid.value))

useHead({
  title: () => order.value?.entity_title_snapshot ?? t('order.title.detail'),
  meta: [{ name: 'robots', content: 'noindex,follow' }]
})

async function load(): Promise<void> {
  errorKey.value = null
  try {
    await store.fetchOne(uuid.value)
  } catch (caught) {
    errorKey.value = resolveOrderError(caught).key
  }
}

onMounted(async () => {
  loading.value = true
  await load()
  loading.value = false
})

async function onRefresh(): Promise<void> {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await load()
  } finally {
    refreshing.value = false
  }
}

const priceLabel = computed(() => {
  if (!order.value) return ''
  const major = Number(order.value.amount.major)
  if (Number.isNaN(major)) {
    return `${order.value.amount.major} ${order.value.amount.currency}`
  }
  return formatPrice(major, order.value.amount.currency)
})

const entityLink = computed(() => {
  if (!order.value) return null
  if (order.value.status !== 'paid') return null
  const path = order.value.entity_type === 'course'
    ? `/courses/${order.value.entity_slug}`
    : `/dashboard/webinars/${order.value.entity_slug}`
  return { path, key: `order.entity_link.${order.value.entity_type}` }
})
</script>

<template>
  <UContainer class="py-10">
    <div class="max-w-2xl space-y-6">
      <NuxtLink
        to="/dashboard/orders"
        class="inline-flex items-center gap-1 text-sm text-muted hover:text-default"
      >
        <UIcon name="i-lucide-arrow-left" />
        {{ t('order.back_to_list') }}
      </NuxtLink>

      <LoadingSkeleton
        v-if="loading && !order"
        variant="card"
      />

      <ErrorState
        v-else-if="errorKey && !order"
        icon="i-lucide-alert-triangle"
        :title="t('common.error_title')"
        :description="t(errorKey)"
      >
        <UButton
          color="primary"
          icon="i-lucide-rotate-ccw"
          :loading="refreshing"
          @click="onRefresh"
        >
          {{ t('common.try_again') }}
        </UButton>
      </ErrorState>

      <template v-else-if="order">
        <header class="space-y-3">
          <OrderStatusBadge :status="order.status" />
          <h1 class="text-2xl font-medium tracking-tight leading-snug">
            {{ order.entity_title_snapshot }}
          </h1>
          <p class="text-sm text-muted">
            {{ t(`order.entity_type.${order.entity_type}`) }}
          </p>
        </header>

        <UCard>
          <dl class="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt class="text-muted">
              {{ t('order.amount.label') }}
            </dt>
            <dd class="font-medium">
              {{ priceLabel }}
            </dd>
          </dl>
        </UCard>

        <OrderTimeline :order="order" />

        <div class="flex flex-wrap items-center gap-3">
          <UButton
            v-if="entityLink"
            :to="entityLink.path"
            color="primary"
            variant="soft"
          >
            {{ t(entityLink.key) }}
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-rotate-ccw"
            :loading="refreshing"
            @click="onRefresh"
          >
            {{ t('order.refresh') }}
          </UButton>
        </div>
      </template>
    </div>
  </UContainer>
</template>
