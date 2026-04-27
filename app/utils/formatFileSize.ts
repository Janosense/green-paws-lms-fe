/**
 * Render a byte count using Ukrainian short units. Decimals follow the
 * `uk-UA` locale ("1,2 МБ"), so the output drops cleanly into UI strings
 * without a separate locale step.
 *
 * Returns "" for `0` or non-finite input — the caller decides whether to
 * render the row at all.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return ''
  }
  const KB = 1024
  const MB = KB * 1024
  const GB = MB * 1024

  if (bytes < KB) {
    return `${bytes} Б`
  }
  if (bytes < MB) {
    return `${formatNumber(bytes / KB, 0)} КБ`
  }
  if (bytes < GB) {
    return `${formatNumber(bytes / MB, 1)} МБ`
  }
  return `${formatNumber(bytes / GB, 1)} ГБ`
}

function formatNumber(value: number, fractionDigits: number): string {
  try {
    return new Intl.NumberFormat('uk-UA', {
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits === 0 ? 0 : fractionDigits
    }).format(value)
  } catch {
    return value.toFixed(fractionDigits)
  }
}
