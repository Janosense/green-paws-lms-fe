/**
 * Validate a redirect target lifted from the `?redirect=` query string.
 * Only returns the target when it points to a same-origin, non-protocol path:
 *   - starts with `/` and not `//` (which browsers treat as protocol-relative)
 *   - does not contain a protocol prefix (`http:`, `javascript:`, `data:`, …)
 *
 * Anything else collapses to `fallback`. Without this, an attacker could
 * craft `/login?redirect=https://evil.com` and bounce the user post-login.
 */
export function safeRedirectTarget(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') {
    return fallback
  }
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/')) {
    return fallback
  }
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback
  }
  return trimmed
}
