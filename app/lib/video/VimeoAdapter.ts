import VimeoPlayer from '@vimeo/player'
import type { VimeoEmbedParameters } from '@vimeo/player/types/formats'
import type {
  VideoPlayerAdapter,
  VideoPlayerEvent,
  VideoPlayerEventHandler,
  VideoPlayerMountOptions
} from './types'

type SubscriberMap = {
  [E in VideoPlayerEvent]: Set<VideoPlayerEventHandler[E]>
}

const TIMEUPDATE_THROTTLE_MS = 1_000

function emptySubscribers(): SubscriberMap {
  return {
    play: new Set(),
    pause: new Set(),
    seek: new Set(),
    timeupdate: new Set(),
    ended: new Set()
  }
}

interface VimeoTimeEvent {
  seconds: number
}

/**
 * Vimeo player adapter. Wraps `@vimeo/player`'s iframe-backed Player and
 * mirrors its async getCurrentTime/getDuration to local sync caches so the
 * adapter contract (which is sync) is satisfied.
 */
export class VimeoAdapter implements VideoPlayerAdapter {
  private player: VimeoPlayer | null = null
  private container: HTMLElement | null = null
  private subscribers = emptySubscribers()

  private lastKnownTime = 0
  private lastTimeUpdateEmit = 0
  private cachedDuration: number | null = null

  private vimeoOnPlay = (): void => { this.emit('play') }
  private vimeoOnPause = (): void => { this.emit('pause') }
  private vimeoOnSeeked = (data: VimeoTimeEvent): void => {
    const from = this.lastKnownTime
    const to = data.seconds
    this.lastKnownTime = to
    this.emit('seek', { from, to })
  }

  private vimeoOnTimeUpdate = (data: VimeoTimeEvent): void => {
    this.lastKnownTime = data.seconds
    const now = Date.now()
    if (now - this.lastTimeUpdateEmit >= TIMEUPDATE_THROTTLE_MS) {
      this.lastTimeUpdateEmit = now
      this.emit('timeupdate', data.seconds)
    }
  }

  private vimeoOnEnded = (): void => { this.emit('ended') }

  async mount(container: HTMLElement, options: VideoPlayerMountOptions): Promise<void> {
    this.container = container

    const idCandidate = options.externalId ? Number.parseInt(options.externalId, 10) : Number.NaN
    const playerOptions: VimeoEmbedParameters = Number.isFinite(idCandidate)
      ? { id: idCandidate, responsive: true }
      // The backend hands us a vimeo URL string — VimeoUrl's literal-template
      // type can't be inferred from a runtime string, so we cast.
      : { url: options.url as `https://vimeo.com/${string}`, responsive: true }

    const player = new VimeoPlayer(container, playerOptions)
    this.player = player

    await player.ready()

    try {
      const duration = await player.getDuration()
      this.cachedDuration = Number.isFinite(duration) ? duration : null
    } catch {
      this.cachedDuration = null
    }

    if (options.startAtSeconds && options.startAtSeconds > 0) {
      try {
        await player.setCurrentTime(options.startAtSeconds)
      } catch {
        // clamp errors are fine — Vimeo rejects when out-of-range
      }
    }

    player.on('play', this.vimeoOnPlay)
    player.on('pause', this.vimeoOnPause)
    player.on('seeked', this.vimeoOnSeeked)
    player.on('timeupdate', this.vimeoOnTimeUpdate)
    player.on('ended', this.vimeoOnEnded)
  }

  async destroy(): Promise<void> {
    const p = this.player
    this.player = null
    if (p) {
      try {
        p.off('play', this.vimeoOnPlay)
        p.off('pause', this.vimeoOnPause)
        p.off('seeked', this.vimeoOnSeeked)
        p.off('timeupdate', this.vimeoOnTimeUpdate)
        p.off('ended', this.vimeoOnEnded)
      } catch {
        // ignore — destroy below is the source of truth
      }
      try {
        await p.destroy()
      } catch {
        // ignore — already torn down
      }
    }
    this.container = null
    this.subscribers = emptySubscribers()
  }

  getCurrentTime(): number {
    return this.lastKnownTime
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
    if (this.player) await this.player.play()
  }

  async pause(): Promise<void> {
    if (this.player) await this.player.pause()
  }

  async seekTo(seconds: number): Promise<void> {
    if (this.player) await this.player.setCurrentTime(seconds)
  }

  canAutoplay(): boolean {
    // Vimeo's SDK lacks a clean autoplay-permission probe; the resume toast
    // is gated by user action so this is safe to leave true.
    return true
  }

  private emit<E extends VideoPlayerEvent>(event: E, ...args: Parameters<VideoPlayerEventHandler[E]>): void {
    for (const handler of this.subscribers[event]) {
      (handler as (...a: unknown[]) => void)(...args)
    }
  }
}
