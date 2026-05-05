<script setup lang="ts">
import type { Order } from '#shared/types/order'
import { isTerminalStatus } from '#shared/types/order'
import { resolveOrderError } from '~/utils/resolveOrderError'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const ordersStore = useOrdersStore()

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const uuid = computed(() => String(route.params.uuid ?? ''))

if (!UUID_RE.test(uuid.value)) {
  await navigateTo('/dashboard/orders')
}

useHead({
  title: () => t('checkout.result.page_title'),
  meta: [{ name: 'robots', content: 'noindex,nofollow' }]
})

const loading = ref(true)
const timedOut = ref(false)
const fatalError = ref<string | null>(null)
const order = computed<Order | null>(() => ordersStore.getOrder(uuid.value))

async function bootstrap(): Promise<void> {
  loading.value = true
  fatalError.value = null
  timedOut.value = false
  try {
    const fetched = await ordersStore.fetchOne(uuid.value)
    if (isTerminalStatus(fetched.status)) {
      loading.value = false
      return
    }
    // Non-terminal — start polling. Show the live order while the loop runs.
    loading.value = false
    try {
      await ordersStore.pollUntilTerminal(uuid.value)
    } catch (caught) {
      const resolved = resolveOrderError(caught)
      if (resolved.code === 'polling_timeout') {
        timedOut.value = true
      } else {
        fatalError.value = resolved.key
      }
    }
  } catch (caught) {
    loading.value = false
    const resolved = resolveOrderError(caught)
    fatalError.value = resolved.key
  }
}

onMounted(() => {
  void bootstrap()
})

onBeforeRouteLeave(() => {
  ordersStore.stopPolling(uuid.value)
})

onUnmounted(() => {
  ordersStore.stopPolling(uuid.value)
})

function onBackToOrders(): void {
  void router.push('/dashboard/orders')
}
</script>

<template>
  <UContainer class="py-12">
    <div class="max-w-xl mx-auto">
      <div
        v-if="loading"
        class="space-y-4 text-center"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-10 mx-auto text-primary animate-spin"
        />
        <p class="text-muted">
          {{ t('checkout.result.loading') }}
        </p>
      </div>

      <ErrorState
        v-else-if="fatalError"
        icon="i-lucide-alert-triangle"
        :title="t('common.error_title')"
        :description="t(fatalError)"
      >
        <UButton
          color="primary"
          @click="onBackToOrders"
        >
          {{ t('order.title.list') }}
        </UButton>
      </ErrorState>

      <OrderResultStateView
        v-else-if="order"
        :order="order"
        :timed-out="timedOut"
      />

      <ErrorState
        v-else
        icon="i-lucide-search-x"
        :title="t('order.errors.order_not_found')"
      >
        <UButton
          color="primary"
          @click="onBackToOrders"
        >
          {{ t('order.title.list') }}
        </UButton>
      </ErrorState>
    </div>
  </UContainer>
</template>
