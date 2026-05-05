import type { ApiError } from '#shared/types/api'

/**
 * Map a backend order error code (Phase 8.1 / 8.3) to its i18n key under
 * `order.errors.*`. Mirrors `resolveCertificateError` in shape: returns the
 * key plus presentation hints, including a passthrough of the response
 * `data` payload so callers can react to `already_enrolled` /
 * `already_registered` (the backend includes the existing enrollment id /
 * registration id under that key).
 *
 * @author Tymofii Synianskyi
 */

export interface OrderErrorResolution {
  code: string
  key: string
  status: number
  data?: unknown
}

const KEY_BY_CODE: Readonly<Record<string, string>> = {
  invalid_entity_type: 'order.errors.invalid_entity_type',
  entity_not_found: 'order.errors.entity_not_found',
  entity_not_purchasable: 'order.errors.entity_not_purchasable',
  already_enrolled: 'order.errors.already_enrolled',
  already_registered: 'order.errors.already_registered',
  webinar_full: 'order.errors.webinar_full',
  payment_provider_unavailable: 'order.errors.payment_provider_unavailable',
  order_not_found: 'order.errors.order_not_found',
  order_not_cancellable: 'order.errors.order_not_cancellable',
  rest_not_logged_in: 'order.errors.unauthorized',
  rest_forbidden: 'order.errors.forbidden'
}

const GENERIC_KEY = 'order.errors.generic'

export function resolveOrderError(error: ApiError | null | unknown): OrderErrorResolution {
  if (!error || typeof error !== 'object') {
    return { code: 'unknown', key: GENERIC_KEY, status: 0 }
  }
  const code = (error as { code?: unknown }).code
  const status = (error as { status?: unknown }).status
  const data = (error as { data?: unknown }).data
  const codeStr = typeof code === 'string' ? code : 'unknown'
  const key = (codeStr in KEY_BY_CODE) ? KEY_BY_CODE[codeStr] : GENERIC_KEY
  return {
    code: codeStr,
    key: key ?? GENERIC_KEY,
    status: typeof status === 'number' ? status : 0,
    data
  }
}
