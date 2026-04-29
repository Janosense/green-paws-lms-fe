import YouTubePlayerFactory from 'youtube-player'
import type { YouTubePlayer } from 'youtube-player/dist/types'
import PlayerStates from 'youtube-player/dist/constants/PlayerStates'
import type {
  VideoPlayerAdapter,
  VideoPlayerEvent,
  VideoPlayerEventHandler,
  VideoPlayerMountOptions
} from './types'

type SubscriberMap = {
  [E in VideoPlayerEvent]: Set<VideoPlayerEventHandler[E]>
}

const TIMEUPDATE_TICK_MS = 1_000
const SEEK_DRIFT_THRESHOLD_S = 2

function emptySubscribers(): SubscriberMap {
  return {
    play: new Set(),
    pause: new Set(),
    seek: new Set(),
    timeupdate: new Set(),
    ended: new Set()
  }
}

/**
 * YouTube IFrame API adapter via `youtube-player`. State changes are mapped
 * to play/pause/ended; seeks are synthesized by detecting position jumps
 * between consecutive PLAYING transitions; timeupdate is driven by a 1Hz
 * polling interval that runs only while playing.
 */
export class YouTubeAdapter implements VideoPlayerAdapter {
  private player: YouTubePlayer | null = null
  private container: HTMLElement | null = null
  private subscribers = emptySubscribers()

  private cachedTime = 0
  private cachedDuration: number | null = null
  private heartbeat: number | null = null
  private lastKnownTimeBeforeSeek = 0

  private onStateChange = (event: CustomEvent & { data: number }): void => {
    const state = event.data
    if (state === PlayerStates.PLAYING) {
      void this.maybeSynthesizeSeek().then(() => {
        this.startHeartbeat()
        this.emit('play')
      })
    } else if (state === PlayerStates.PAUSED) {
      this.stopHeartbeat()
      this.snapshotTimeForSeekDetection()
      this.emit('pause')
    } else if (state === PlayerStates.ENDED) {
      this.stopHeartbeat()
      this.emit('ended')
    } else if (state === PlayerStates.BUFFERING) {
      this.snapshotTimeForSeekDetection()
    }
  }

  async mount(container: HTMLElement, options: VideoPlayerMountOptions): Promise<void> {
    this.container = container

    // Reserve a child for the iframe so destroy() can cleanly remove it.
    const host = document.createElement('div')
    host.style.width = '100%'
    host.style.height = '100%'
    container.appendChild(host)

    const videoId = options.externalId ?? this.extractVideoIdFromUrl(options.url)
    if (!videoId) {
      throw new Error('YouTube adapter: missing externalId and could not derive videoId from url')
    }

    const player = YouTubePlayerFactory(host, {
      width: '100%',
      height: '100%',
      videoId,
      playerVars: {
        rel: 0,
        modestbranding: 1,
        playsinline: 1
      }
    })
    this.player = player

    // Wait for the player to reach a non-unstarted state.
    await this.waitForReady()

    try {
      const duration = await player.getDuration()
      this.cachedDuration = Number.isFinite(duration) && duration > 0 ? duration : null
    } catch {
      this.cachedDuration = null
    }

    if (options.startAtSeconds && options.startAtSeconds > 0) {
      try {
        await player.seekTo(options.startAtSeconds, true)
      } catch {
        // ignore — seekTo rejects on cued-but-not-yet-loaded videos
      }
      this.cachedTime = options.startAtSeconds
      this.lastKnownTimeBeforeSeek = options.startAtSeconds
    }

    player.on('stateChange', this.onStateChange)
  }

  async destroy(): Promise<void> {
    this.stopHeartbeat()
    const p = this.player
    this.player = null
    if (p) {
      try {
        await p.destroy()
      } catch {
        // ignore — already torn down
      }
    }
    if (this.container) {
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild)
      }
    }
    this.container = null
    this.subscribers = emptySubscribers()
  }

  getCurrentTime(): number {
    return this.cachedTime
  }

  getDuration(): number | null {
    return this.cachedDuration
  }

  on<E extends VideoPlayerEvent>(event: E, handler: VideoPlayerEventHandler[E]): void {
    this.subscribers[event].add(handler)
  }

  off<E extends VideoPlayerEvent>(event: E, handler: VideoPlayerEventHandler[E]): void {
    this.subscribers[event].delete(handler)
  }

  async play(): Promise<void> {
    if (this.player) await this.player.playVideo()
  }

  async pause(): Promise<void> {
    if (this.player) await this.player.pauseVideo()
  }

  async seekTo(seconds: number): Promise<void> {
    if (this.player) {
      this.lastKnownTimeBeforeSeek = this.cachedTime
      await this.player.seekTo(seconds, true)
      this.cachedTime = seconds
    }
  }

  canAutoplay(): boolean {
    return true
  }

  private async waitForReady(): Promise<void> {
    const player = this.player
    if (!player) return
    const deadline = Date.now() + 10_000
    while (Date.now() < deadline) {
      try {
        const state = await player.getPlayerState()
        if (state === PlayerStates.UNSTARTED || state === PlayerStates.VIDEO_CUED) {
          return
        }
        if (state === PlayerStates.PLAYING || state === PlayerStates.PAUSED) {
          return
        }
      } catch { /* not yet ready */ }
      await new Promise<void>(resolve => setTimeout(resolve, 100))
    }
  }

  private snapshotTimeForSeekDetection(): void {
    this.lastKnownTimeBeforeSeek = this.cachedTime
  }

  private async maybeSynthesizeSeek(): Promise<void> {
    if (!this.player) return
    let now = this.cachedTime
    try {
      now = await this.player.getCurrentTime()
    } catch {
      // keep cached value on transient SDK errors
    }
    this.cachedTime = now
    const drift = Math.abs(now - this.lastKnownTimeBeforeSeek)
    if (drift > SEEK_DRIFT_THRESHOLD_S) {
      const from = this.lastKnownTimeBeforeSeek
      const to = now
      this.lastKnownTimeBeforeSeek = now
      this.emit('seek', { from, to })
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeat = window.setInterval(() => {
      const player = this.player
      if (!player) return
      void player.getCurrentTime().then((t: number) => {
        if (Number.isFinite(t)) {
          this.cachedTime = t
          this.emit('timeupdate', t)
        }
      }).catch(() => { /* ignore transient SDK errors */ })
    }, TIMEUPDATE_TICK_MS)
  }

  private stopHeartbeat(): void {
    if (this.heartbeat != null) {
      window.clearInterval(this.heartbeat)
      this.heartbeat = null
    }
  }

  private extractVideoIdFromUrl(url: string): string | null {
    try {
      const parsed = new URL(url)
      const v = parsed.searchParams.get('v')
      if (v) return v
      const segments = parsed.pathname.split('/').filter(Boolean)
      const last = segments[segments.length - 1]
      return last ?? null
    } catch {
      return null
    }
  }

  private emit<E extends VideoPlayerEvent>(event: E, ...args: Parameters<VideoPlayerEventHandler[E]>): void {
    for (const handler of this.subscribers[event]) {
      (handler as (...a: unknown[]) => void)(...args)
    }
  }
}
