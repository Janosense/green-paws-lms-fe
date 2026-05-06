import { defineStore } from 'pinia'
import type { ApiError } from '#shared/types/api'
import type {
  Order,
  OrderCreationResponse,
  OrderEntityType,
  OrdersListResponse
} from '#shared/types/order'
import { isTerminalStatus } from '#shared/types/order'

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

interface PollOptions {
  intervalMs?: number
  timeoutMs?: number
}

const DEFAULT_INTERVAL_MS = 2000
const DEFAULT_TIMEOUT_MS = 60_000

/**
 * Phase 8.4 — orders store.
 *
 * Mirrors `certificates.ts` (per-uuid detail cache) and `webinarRegistrations.ts`
 * (mutation actions that upsert in place). Hydrated on boot for authed users
 * by `app/plugins/orders.ts`; the dashboard sidebar exposes the list under
 * "Мої замовлення".
 *
 * `pollUntilTerminal` is the bespoke piece — the result page polls every 2s
 * for up to 60s, advancing UI state as the backend's LiqPay callback flips
 * the order to a terminal status. Active intervals are tracked by uuid so
 * `stopPolling` can cancel cleanly on unmount / route-leave.
 *
 * @author Tymofii Synianskyi
 */
export const useOrdersStore = defineStore('orders', () => {
  const items = ref<Order[]>([])
  const detailsByUuid = ref<Map<string, Order>>(new Map())
  const status = ref<FetchStatus>('idle')
  const error = ref<ApiError | null>(null)
  const initialized = ref(false)

  const initInflight = ref<Promise<void> | null>(null)
  const pollingIntervals = new Map<string, ReturnType<typeof setInterval>>()

  const activeOrders = computed(() =>
    items.value.filter(o => o.status === 'pending' || o.status === 'awaiting_payment')
  )
  const paidOrders = computed(() => items.value.filter(o => o.status === 'paid'))
  const cancelledOrders = computed(() => items.value.filter(o => o.status === 'cancelled'))
  const expiredOrders = computed(() => items.value.filter(o => o.status === 'expired'))
  const refundedOrders = computed(() => items.value.filter(o => o.status === 'refunded'))

  function getOrder(uuid: string): Order | null {
    return detailsByUuid.value.get(uuid) ?? items.value.find(o => o.uuid === uuid) ?? null
  }

  function clear(): void {
    items.value = []
    detailsByUuid.value = new Map()
    status.value = 'idle'
    error.value = null
    initialized.value = false
    initInflight.value = null
    for (const handle of pollingIntervals.values()) {
      clearInterval(handle)
    }
    pollingIntervals.clear()
  }

  function upsertItem(order: Order): void {
    const index = items.value.findIndex(o => o.uuid === order.uuid)
    if (index >= 0) {
      items.value.splice(index, 1, order)
    } else {
      items.value = [order, ...items.value]
    }
    const next = new Map(detailsByUuid.value)
    next.set(order.uuid, order)
    detailsByUuid.value = next
  }

  async function refreshList(): Promise<void> {
    const api = useApi()
    status.value = 'loading'
    try {
      const response = await api.get<OrdersListResponse>('/vl/v1/orders/me')
      items.value = Array.isArray(response?.items) ? response.items : []
      status.value = 'success'
      error.value = null
    } catch (caught) {
      status.value = 'error'
      error.value = caught as ApiError
    } finally {
      initialized.value = true
    }
  }

  function init(): Promise<void> {
    if (initialized.value) {
      return Promise.resolve()
    }
    if (initInflight.value) {
      return initInflight.value
    }
    const promise = refreshList().finally(() => {
      initInflight.value = null
    })
    initInflight.value = promise
    return promise
  }

  async function fetchOne(uuid: string): Promise<Order> {
    const api = useApi()
    const order = await api.get<Order>(`/vl/v1/orders/${uuid}`)
    upsertItem(order)
    return order
  }

  async function createOrder(
    entity_type: OrderEntityType,
    slug: string
  ): Promise<OrderCreationResponse> {
    const api = useApi()
    const response = await api.post<OrderCreationResponse>('/vl/v1/orders', {
      entity_type,
      entity_slug: slug
    })
    upsertItem(response.order)
    return response
  }

  async function cancelOrder(uuid: string): Promise<Order> {
    const api = useApi()
    const order = await api.post<Order>(`/vl/v1/orders/${uuid}/cancel`)
    upsertItem(order)
    return order
  }

  function stopPolling(uuid: string): void {
    const handle = pollingIntervals.get(uuid)
    if (handle !== undefined) {
      clearInterval(handle)
      pollingIntervals.delete(uuid)
    }
  }

  /**
   * Poll `fetchOne(uuid)` every `intervalMs` (default 2s) until the order's
   * status is terminal or `timeoutMs` (default 60s) elapses. Resolves with
   * the final order on terminal, rejects with `{code: 'polling_timeout'}` on
   * timeout. Cancellable via `stopPolling(uuid)` — the returned promise
   * rejects with `{code: 'polling_cancelled'}`.
   */
  function pollUntilTerminal(uuid: string, options: PollOptions = {}): Promise<Order> {
    const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

    stopPolling(uuid)

    return new Promise<Order>((resolve, reject) => {
      const startedAt = Date.now()
      let settled = false

      const settle = (fn: () => void): void => {
        if (settled) return
        settled = true
        stopPolling(uuid)
        fn()
      }

      const tick = async (): Promise<void> => {
        if (settled) return
        try {
          const order = await fetchOne(uuid)
          if (isTerminalStatus(order.status)) {
            settle(() => resolve(order))
            return
          }
          if (Date.now() - startedAt >= timeoutMs) {
            settle(() => reject({
              code: 'polling_timeout',
              message: 'Order did not reach a terminal status before timeout',
              status: 0
            } as ApiError))
          }
        } catch (caught) {
          settle(() => reject(caught))
        }
      }

      const handle = setInterval(() => {
        void tick()
      }, intervalMs)
      pollingIntervals.set(uuid, handle)
      // Kick off immediately so the page does not wait one full interval
      // before the first `fetchOne` completes.
      void tick()
    })
  }

  return {
    // state
    items,
    detailsByUuid,
    status,
    error,
    initialized,
    // getters
    activeOrders,
    paidOrders,
    cancelledOrders,
    expiredOrders,
    refundedOrders,
    // utilities
    getOrder,
    // actions
    init,
    refreshList,
    fetchOne,
    createOrder,
    cancelOrder,
    pollUntilTerminal,
    stopPolling,
    clear
  }
})
