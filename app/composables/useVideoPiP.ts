import type { Ref } from 'vue'

/**
 * Phase 9.7 — picture-in-picture (sticky) lesson video.
 *
 * When the lesson video element scrolls out of viewport, returns
 * `isPipActive === true` so the caller can apply a fixed-position class
 * to dock the player as a 240×135 thumbnail in the bottom-right corner.
 * `dismiss()` flips a session flag that suppresses PiP for the rest of
 * the page visit.
 *
 * Suppressed entirely in two cases:
 *  - Preview mode (`?preview=1`) — instructors should not see PiP while
 *    walking the course as if enrolled.
 *  - Below the `md` breakpoint (768px) — mobile already has its own
 *    sticky-video layout; a second floating frame is redundant.
 */
export function useVideoPiP(videoRef: Ref<HTMLElement | null>): {
  isPipActive: Ref<boolean>
  dismiss: () => void
} {
  const { isPreview } = useLessonPreview()

  const isPipActive = ref(false)
  const pipDismissed = ref(false)

  if (isPreview.value) {
    return { isPipActive: ref(false), dismiss: () => {} }
  }

  if (import.meta.server) {
    return { isPipActive, dismiss: () => { pipDismissed.value = true } }
  }

  const isInViewport = useElementVisibility(videoRef)
  const breakpoints = useBreakpoints({ md: 768 })
  const isMdAndUp = breakpoints.greaterOrEqual('md')

  watch([isInViewport, pipDismissed, isMdAndUp], ([visible, dismissed, mdAndUp]) => {
    isPipActive.value = !visible && !dismissed && mdAndUp
  }, { immediate: true })

  function dismiss(): void {
    pipDismissed.value = true
    isPipActive.value = false
  }

  return { isPipActive, dismiss }
}
