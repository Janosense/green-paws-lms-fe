/**
 * Phase 5.5 — video player adapter contract.
 *
 * The four adapters (Vimeo, YouTube, native file, opaque embed) implement
 * this interface so the rest of the learn runtime treats them
 * interchangeably. Adapters are pure SDK wrappers — they MUST NOT import
 * `useApi`, Pinia stores, or any app-level code.
 */

export type VideoPlayerEvent
  = | 'play'
    | 'pause'
    | 'seek'
    | 'timeupdate'
    | 'ended'

export interface VideoPlayerSeekPayload {
  from: number
  to: number
}

export interface VideoPlayerEventHandler {
  play: () => void
  pause: () => void
  seek: (payload: VideoPlayerSeekPayload) => void
  timeupdate: (currentTime: number) => void
  ended: () => void
}

export interface VideoPlayerMountOptions {
  url: string
  externalId: string | null
  embedUrl: string | null
  startAtSeconds?: number
}

export interface VideoPlayerAdapter {
  /** Mount the player into the given container. Resolves when ready to play. */
  mount: (container: HTMLElement, options: VideoPlayerMountOptions) => Promise<void>

  /** Tear down. Releases SDK resources, removes the iframe/video element. */
  destroy: () => Promise<void>

  /** Sync current position in seconds. Returns 0 if not yet ready. */
  getCurrentTime: () => number

  /** Sync duration in seconds. Returns null if unknown (live streams, embed adapter). */
  getDuration: () => number | null

  /** Subscribe to a player event. Multiple subscribers per event are supported. */
  on: <E extends VideoPlayerEvent>(event: E, handler: VideoPlayerEventHandler[E]) => void

  /** Unsubscribe a specific handler. */
  off: <E extends VideoPlayerEvent>(event: E, handler: VideoPlayerEventHandler[E]) => void

  /** Programmatic playback control. May be no-op for embed adapter. */
  play: () => Promise<void>
  pause: () => Promise<void>
  seekTo: (seconds: number) => Promise<void>

  /** True if play() is allowed (autoplay-policy gate). */
  canAutoplay: () => boolean
}
