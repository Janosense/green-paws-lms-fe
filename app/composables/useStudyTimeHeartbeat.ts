import type { Ref } from 'vue'
import type { ApiError } from '#shared/types/api'
import type { VideoPlayerAdapter } from '~/lib/video/types'

/** The two ledger kinds of `vl_study_time` (feature `study-time`). */
export type StudyKind = 'video' | 'reading'

export interface UseStudyTimeHeartbeatOptions {
  /**
   * Ledger entity types only. `#shared/types/learn`'s `EntityType` also has
   * `module` and `session`, which the endpoint refuses with 422.
   */
  entityType: 'lesson' | 'topic'
  entityId: number
  /** The mounted adapter; null until the player is ready (or always null for non-video). */
  videoAdapter: Ref<VideoPlayerAdapter | null>
}

/** Bare response of `GET /vl/v1/study-time/config` (docs/DECISIONS.md 2026-09-16). */
interface StudyTimeConfigResponse {
  idle_seconds: number
  heartbeat_seconds: number
  /** Server-side per-signal ceiling. Read for completeness; the client never reasons about it. */
  cap_seconds: number
}

export interface StudyKindInput {
  isPlaying: boolean
  isVisible: boolean
  secondsSinceInteraction: number
  idleSeconds: number
}

/**
 * Record an interaction at most once a second. A pointer crossing the page
 * fires hundreds of events; all any of them has to do is move a timestamp.
 */
const INTERACTION_THROTTLE_MS = 1_000

const INTERACTION_EVENTS = ['pointermove', 'scroll', 'keydown', 'click'] as const

/**
 * The whole kind rule of feature `study-time`, in one pure function
 * (`docs/features/study-time/FEATURE.md` → Invariants):
 *
 * - `video`   — the player is playing AND the tab is on screen
 * - `reading` — the tab is on screen, the player is not playing, and the
 *               learner interacted within the idle window
 * - `null`    — send nothing: an idle or hidden tab accrues no study time
 *
 * Kept separate from the timer and the listeners so the rule can be read —
 * and, once `frontend/` has a test runner, tested — on its own.
 */
export function decideStudyKind(input: StudyKindInput): StudyKind | null {
  if (!input.isVisible) return null
  if (input.isPlaying) return 'video'
  if (input.secondsSinceInteraction <= input.idleSeconds) return 'reading'
  return null
}

/**
 * Sprint 1 Step 6 — the client half of active study time.
 *
 * Every `heartbeat_seconds` it decides what the learner is doing and posts
 * one `{entity_type, entity_id, kind}` to `POST /vl/v1/study-time/heartbeat`.
 * It never sends a duration: the server computes the increment from its own
 * clock and caps it per learner per course (`docs/DECISIONS.md` 2026-09-15).
 *
 * The three intervals come from `GET /vl/v1/study-time/config`, read once per
 * mount — they are business values the server owns (root `CLAUDE.md` core
 * rule 3), so this file holds no interval constant and, when that request
 * fails, this mount simply records nothing.
 *
 * Fire-and-forget, like {@link useProgressTracker}: a failed heartbeat is
 * logged in dev and dropped, and study time never blocks the learner. A 403
 * (the enrollment gate refusing) stops the loop for this mount.
 *
 * No-op under `?preview=1` — an instructor walking a course leaves no trail.
 */
export function useStudyTimeHeartbeat(options: UseStudyTimeHeartbeatOptions): void {
  const api = useApi()
  const { isPreview } = useLessonPreview()

  let heartbeatTimer: number | null = null
  let stopped = false
  // Our own playing flag, fed only by the adapter's events: the adapter
  // contract has no playing-state getter. Deliberately NOT mirroring
  // `useProgressTracker.onVisibilityChange()`, which clears its flag when the
  // tab hides without pausing the player and never sees a `play` when the tab
  // returns — here visibility is read at tick time instead, so a learner who
  // hides the tab mid-video accrues nothing while away and resumes on return.
  let isPlaying = false
  let lastInteractionAt = Date.now()
  let attachedAdapter: VideoPlayerAdapter | null = null
  let stopAdapterWatch: (() => void) | null = null

  function stop(): void {
    stopped = true
    if (heartbeatTimer != null) {
      window.clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function send(kind: StudyKind): void {
    if (isPreview.value || stopped) return
    api
      .post('/vl/v1/study-time/heartbeat', {
        entity_type: options.entityType,
        entity_id: options.entityId,
        kind
      })
      .catch((e: unknown) => {
        // `not_enrolled`: the gate will refuse every following beat too.
        if ((e as ApiError | null)?.status === 403) {
          stop()
        }
        if (import.meta.dev) {
          console.warn('[study-time] heartbeat failed', kind, e)
        }
      })
  }

  function tick(idleSeconds: number): void {
    const kind = decideStudyKind({
      isPlaying,
      isVisible: document.visibilityState === 'visible',
      secondsSinceInteraction: (Date.now() - lastInteractionAt) / 1000,
      idleSeconds
    })
    if (kind) {
      send(kind)
    }
  }

  function onInteraction(): void {
    const now = Date.now()
    if (now - lastInteractionAt < INTERACTION_THROTTLE_MS) return
    lastInteractionAt = now
  }

  function onPlaybackStarted(): void {
    isPlaying = true
  }

  /** `pause` and `ended` both mean the same thing here: not playing. */
  function onPlaybackStopped(): void {
    isPlaying = false
  }

  function attach(adapter: VideoPlayerAdapter): void {
    if (attachedAdapter === adapter) return
    if (attachedAdapter) detach()
    attachedAdapter = adapter
    adapter.on('play', onPlaybackStarted)
    adapter.on('pause', onPlaybackStopped)
    adapter.on('ended', onPlaybackStopped)
  }

  function detach(): void {
    if (!attachedAdapter) return
    attachedAdapter.off('play', onPlaybackStarted)
    attachedAdapter.off('pause', onPlaybackStopped)
    attachedAdapter.off('ended', onPlaybackStopped)
    attachedAdapter = null
    isPlaying = false
  }

  function addInteractionListeners(): void {
    for (const event of INTERACTION_EVENTS) {
      // Capture, because `scroll` does not bubble: without it a scroll inside
      // the curriculum slideover would never count as an interaction.
      document.addEventListener(event, onInteraction, { passive: true, capture: true })
    }
  }

  function removeInteractionListeners(): void {
    for (const event of INTERACTION_EVENTS) {
      document.removeEventListener(event, onInteraction, { capture: true })
    }
  }

  onMounted(async () => {
    // Preview leaves no trail at all — not even the config request.
    if (isPreview.value) return

    let config: StudyTimeConfigResponse
    try {
      config = await api.get<StudyTimeConfigResponse>('/vl/v1/study-time/config')
    } catch (e) {
      // No configuration, no loop: the intervals live on the server and this
      // file may not invent them.
      if (import.meta.dev) {
        console.warn('[study-time] config unavailable — not tracking this mount', e)
      }
      return
    }

    if (stopped) return

    stopAdapterWatch = watch(
      () => options.videoAdapter.value,
      (adapter) => {
        if (adapter) {
          attach(adapter)
        } else {
          detach()
        }
      },
      { immediate: true }
    )

    addInteractionListeners()

    heartbeatTimer = window.setInterval(
      () => tick(config.idle_seconds),
      config.heartbeat_seconds * 1000
    )
  })

  onBeforeUnmount(() => {
    stop()
    detach()
    if (stopAdapterWatch) {
      stopAdapterWatch()
      stopAdapterWatch = null
    }
    if (typeof document !== 'undefined') {
      removeInteractionListeners()
    }
  })
}
