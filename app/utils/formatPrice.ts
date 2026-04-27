/**
 * Render a card price as a localized string. Returns an empty string for
 * `0` so the caller can substitute the i18n "free" key — keeping user-facing
 * Ukrainian out of pure utilities (per project i18n contract).
 *
 * UAH is rendered with the ₴ glyph; everything else falls back to
 * `Intl.NumberFormat` with the currency code.
 */
export function formatPrice(price: number, currency: string): string {
  if (price <= 0) {
    return ''
  }
  if (currency === 'UAH') {
    return `${formatNumber(price)} ₴`
  }
  try {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(price)
  } catch {
    return `${formatNumber(price)} ${currency}`
  }
}

function formatNumber(value: number): string {
  const fractionDigits = Number.isInteger(value) ? 0 : 2
  try {
    return new Intl.NumberFormat('uk-UA', {
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits
    }).format(value)
  } catch {
    return value.toString()
  }
}
