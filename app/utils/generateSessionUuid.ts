/**
 * Generate a canonical UUID v4 string for a per-page-mount learning session.
 *
 * Used by `useProgressTracker` to tag every event in the same view session
 * with a stable identifier the backend can use to dedupe and stitch together
 * a single play-through.
 */
export function generateSessionUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  // Fallback for ancient environments. Nuxt 4 + Node 19+ should never hit
  // this path in practice; included so SSR cannot crash on a missing global.
  const bytes = new Uint8Array(16)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
