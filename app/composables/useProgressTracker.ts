import type { Ref } from 'vue'
import type { EntityType, ProgressShape } from '#shared/types/learn'
import type {
  VideoPlayerAdapter,
  VideoPlayerSeekPayload
} from '~/lib/video/types'

type ProgressEventType
  = 'view_start'
    | 'play'
    | 'pause'
    | 'seek'
    | 'progress'
    | 'complete'
    | 'unload'

export interface UseProgressTrackerOptions {
  entityType: EntityType
  entityId: number
  /** Total duration in seconds. 0 when unknown or non-video. */
  durationSeconds: number
  initialProgress: ProgressShape
  /** The mounted adapter; null until the player is ready (or always null for non-video). */
  videoAdapter: Ref<VideoPlayerAdapter | null>
}

const HEARTBEAT_INTERVAL_MS = 30_000
const COMPLETION_THRESHOLD = 0.9

/**
 * Phase 5.5 — orchestrates auto-save events for the lesson player.
 *
 * Owns: a per-mount session UUID, the 30s playback heartbeat, the 90%
 * auto-completion guard, the beforeunload beacon, and the visibilitychange
 * fallback. Fire-and-forget: every send() error is swallowed (logged in dev).
 */
export function useProgressTracker(options: UseProgressTrackerOptions) {
  const sessionUuid = generateSessionUuid()
  const completed = ref(options.initialProgress.status === 'completed')
  const lastKnownPosition = ref<number>(options.initialProgress.position_seconds ?? 0)
  const completionFiredThisSession = ref(false)

  const api = useApi()
  const { isPreview } = useLessonPreview()

  let heartbeatTimer: number | null = null
  let isPlaying = false
  let attachedAdapter: VideoPlayerAdapter | null = null

  function send(eventType: ProgressEventType, positionSeconds: number | null, payload?: unknown): void {
    if (isPreview.value) return
    const body = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      session_uuid: sessionUuid,
      event_type: eventType,
      position_seconds: positionSeconds == null ? null : Math.max(0, Math.round(positionSeconds)),
      payload: payload ?? null
    }
    api.post('/vl/v1/progress', body).catch((e: unknown) => {
      if (import.meta.dev) {
        console.warn('[progress-tracker] send failed', eventType, e)
      }
    })
  }

  function emitViewStart(): void {
    send('view_start', null)
  }

  function readPosition(): number {
    return options.videoAdapter.value?.getCurrentTime() ?? lastKnownPosition.value
  }

  function maybeAutoComplete(positionSeconds: number): void {
    if (completionFiredThisSession.value || completed.value) return
    if (options.durationSeconds <= 0) return
    if (positionSeconds / options.durationSeconds < COMPLETION_THRESHOLD) return
    completionFiredThisSession.value = true
    completed.value = true
    send('complete', positionSeconds)
  }

  function startHeartbeat(): void {
    stopHeartbeat()
    heartbeatTimer = window.setInterval(() => {
      if (!isPlaying || !options.videoAdapter.value) return
      const pos = options.videoAdapter.value.getCurrentTime()
      lastKnownPosition.value = pos
      send('progress', pos)
      maybeAutoComplete(pos)
    }, HEARTBEAT_INTERVAL_MS)
  }

  function stopHeartbeat(): void {
    if (heartbeatTimer != null) {
      window.clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function onPlay(): void {
    isPlaying = true
    const pos = readPosition()
    lastKnownPosition.value = pos
    send('play', pos)
    startHeartbeat()
  }

  function onPause(): void {
    isPlaying = false
    const pos = readPosition()
    lastKnownPosition.value = pos
    send('pause', pos)
    stopHeartbeat()
  }

  function onSeek(payload: VideoPlayerSeekPayload): void {
    lastKnownPosition.value = payload.to
    send('seek', payload.to, { from: Math.round(payload.from), to: Math.round(payload.to) })
  }

  function onTimeUpdate(t: number): void {
    lastKnownPosition.value = t
    maybeAutoComplete(t)
  }

  function onEnded(): void {
    isPlaying = false
    stopHeartbeat()
    if (!completed.value && !completionFiredThisSession.value) {
      completionFiredThisSession.value = true
      completed.value = true
      send('complete', readPosition())
    }
  }

  function markComplete(): void {
    if (completed.value) return
    completed.value = true
    completionFiredThisSession.value = true
    send('complete', readPosition())
  }

  function attach(adapter: VideoPlayerAdapter): void {
    if (attachedAdapter === adapter) return
    if (attachedAdapter) detach()
    attachedAdapter = adapter
    adapter.on('play', onPlay)
    adapter.on('pause', onPause)
    adapter.on('seek', onSeek)
    adapter.on('timeupdate', onTimeUpdate)
    adapter.on('ended', onEnded)
  }

  function detach(): void {
    if (!attachedAdapter) return
    attachedAdapter.off('play', onPlay)
    attachedAdapter.off('pause', onPause)
    attachedAdapter.off('seek', onSeek)
    attachedAdapter.off('timeupdate', onTimeUpdate)
    attachedAdapter.off('ended', onEnded)
    attachedAdapter = null
  }

  function onBeforeUnload(): void {
    if (isPreview.value) return
    const pos = readPosition()
    sendBeaconJson('/vl/v1/progress', {
      entity_type: options.entityType,
      entity_id: options.entityId,
      session_uuid: sessionUuid,
      event_type: 'unload',
      position_seconds: Math.max(0, Math.round(pos)),
      payload: null
    })
  }

  function onVisibilityChange(): void {
    if (typeof document === 'undefined') return
    if (document.visibilityState === 'hidden' && isPlaying) {
      // Some providers keep playing in a hidden tab; record a pause so
      // server-side activity windows are accurate.
      isPlaying = false
      const pos = readPosition()
      lastKnownPosition.value = pos
      send('pause', pos)
      stopHeartbeat()
    }
  }

  let stopAdapterWatch: (() => void) | null = null

  onMounted(() => {
    emitViewStart()

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

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onBeforeUnmount(() => {
    stopHeartbeat()
    detach()
    if (stopAdapterWatch) {
      stopAdapterWatch()
      stopAdapterWatch = null
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  })

  return {
    sessionUuid,
    completed: readonly(completed),
    lastKnownPosition: readonly(lastKnownPosition),
    markComplete,
    onPlay,
    onPause,
    onSeek,
    onTimeUpdate,
    onEnded
  }
}
