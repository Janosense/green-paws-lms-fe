/**
 * Phase 8.4 wire-shape contracts for `vl/v1/orders/*`.
 *
 * Mirrors the backend transformers added in Phase 8.1:
 * - {@link Order} ← `OrderTransformer`
 * - {@link PreparedPayment} ← `PreparedPaymentTransformer`
 *
 * The `OrderCreationResponse` shape comes back from `POST /vl/v1/orders` and
 * pairs the persisted order with the signed LiqPay form payload that the
 * frontend submits to `liqpay.ua/api/3/checkout`.
 *
 * @author Tymofii Synianskyi
 */

export type OrderStatus
  = | 'pending'
    | 'awaiting_payment'
    | 'paid'
    | 'failed'
    | 'cancelled'
    | 'expired'
    | 'refunded'

/**
 * The set of entities that can be purchased through the checkout flow. Named
 * `OrderEntityType` (rather than the spec's bare `EntityType`) to avoid
 * colliding with the `learn` module's progress-tracking `EntityType`.
 */
export type OrderEntityType = 'course' | 'webinar'

export interface OrderAmount {
  major: string
  minor_units: number
  currency: string
}

export interface Order {
  uuid: string
  status: OrderStatus
  payment_provider: string
  entity_type: OrderEntityType
  entity_id: number
  entity_slug: string
  entity_title_snapshot: string
  amount: OrderAmount
  created_at: string
  expires_at: string
  paid_at: string | null
  cancelled_at: string | null
  refunded_at: string | null
}

export interface PreparedPaymentFields {
  data: string
  signature: string
  version: string
}

export interface PreparedPayment {
  action_url: string
  http_method: string
  fields: PreparedPaymentFields
}

/**
 * Bare response from `POST /vl/v1/orders` — the controller does not wrap
 * this in the `{success, data}` envelope (see Phase 8.1 OrdersController).
 */
export interface OrderCreationResponse {
  order: Order
  payment_form: PreparedPayment
}

/**
 * Bare response from `GET /vl/v1/orders/me`. No envelope wrapping.
 */
export interface OrdersListResponse {
  items: Order[]
  total: number
  page: number
  per_page: number
}

/**
 * Bare response from `GET /vl/v1/orders/{uuid}` — the order itself, no envelope.
 */
export type OrderResponse = Order

/**
 * Statuses in which the order will not change without external action.
 * Drives polling termination on `/orders/[uuid]/result`.
 */
export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  'paid',
  'failed',
  'cancelled',
  'expired',
  'refunded'
] as const

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status)
}
