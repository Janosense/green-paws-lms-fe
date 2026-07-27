/**
 * Format a backend ISO 8601 timestamp in the UTC offset that timestamp
 * carries, rather than in the ambient timezone of whoever renders it.
 *
 * `Intl.DateTimeFormat` without an explicit `timeZone` resolves against the
 * host timezone. Vercel runs Node with `TZ=UTC` while visitors' browsers run
 * `Europe/Kyiv`, so the same timestamp renders "11:23" during SSR and "14:23"
 * during hydration — Vue reports "Hydration completed but contains
 * mismatches" and the served HTML shows a time three hours off until Vue
 * patches it. Locking the format to the source offset makes both passes
 * agree on every host.
 *
 * Pinning to the source offset also preserves the wall clock the editor typed
 * into wp-admin: `AbstractMetaBox::datetime_local_to_iso8601()` interprets the
 * `datetime-local` input in the site timezone and stores it as
 * `Y-m-d\TH:i:sP`, so the offset travelling with the value *is* the intended
 * reading. A webinar scheduled for 14:30 therefore reads 14:30 for everyone,
 * which is what a Zoom start time means.
 *
 * Timestamps with no offset are read as UTC instead of being handed to
 * `new Date()`, whose fallback parsing is local-time and therefore
 * host-dependent in exactly the same way.
 *
 * Returns `null` when the input cannot be parsed or `Intl` rejects the
 * options, so callers keep their own fallback rendering.
 */
const ISO_OFFSET = /(?:(Z)|([+-])(\d{2}):?(\d{2}))$/i

/** Minutes east of UTC carried by `iso`; `null` when it carries none. */
function offsetMinutes(iso: string): number | null {
  const match = ISO_OFFSET.exec(iso)
  if (!match) {
    return null
  }
  if (match[1]) {
    return 0
  }
  return (match[2] === '-' ? -1 : 1) * (Number(match[3]) * 60 + Number(match[4]))
}

export function formatInSourceOffset(
  iso: string,
  locale: string,
  options: Intl.DateTimeFormatOptions
): string | null {
  const trimmed = iso.trim()
  const offset = offsetMinutes(trimmed)
  const parsed = new Date(offset === null ? `${trimmed.replace(' ', 'T')}Z` : trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  // Shift the instant by its own offset, then read it back as UTC: the
  // result is the source wall clock regardless of what `TZ` says.
  const wallClock = new Date(parsed.getTime() + (offset ?? 0) * 60_000)
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(wallClock)
  } catch {
    return null
  }
}
