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
const SEEK_DRIFT_GUARD_S = 0.25

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
 * Native HTML5 `<video>` adapter. No third-party SDK; the simplest backing.
 */
export class FileAdapter implements VideoPlayerAdapter {
  private container: HTMLElement | null = null
  private video: HTMLVideoElement | null = null
  private subscribers = emptySubscribers()

  private lastKnownTime = 0
  private lastTimeUpdateEmit = 0
  private lastDuration: number | null = null

  private onLoadedMetadata = (): void => {
    if (this.video && Number.isFinite(this.video.duration)) {
      this.lastDuration = this.video.duration
    }
  }

  private onPlay = (): void => {
    this.emit('play')
  }

  private onPause = (): void => {
    this.emit('pause')
  }

  private onSeeked = (): void => {
    if (!this.video) return
    const to = this.video.currentTime
    const from = this.lastKnownTime
    this.lastKnownTime = to
    if (Math.abs(to - from) >= SEEK_DRIFT_GUARD_S) {
      this.emit('seek', { from, to })
    }
  }

  private onTimeUpdate = (): void => {
    if (!this.video) return
    const t = this.video.currentTime
    this.lastKnownTime = t
    const now = Date.now()
    if (now - this.lastTimeUpdateEmit >= TIMEUPDATE_THROTTLE_MS) {
      this.lastTimeUpdateEmit = now
      this.emit('timeupdate', t)
    }
  }

  private onEnded = (): void => {
    this.emit('ended')
  }

  mount(container: HTMLElement, options: VideoPlayerMountOptions): Promise<void> {
    this.container = container

    const video = document.createElement('video')
    video.controls = true
    video.preload = 'metadata'
    video.playsInline = true
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.display = 'block'
    video.src = options.url

    container.appendChild(video)
    this.video = video

    video.addEventListener('play', this.onPlay)
    video.addEventListener('pause', this.onPause)
    video.addEventListener('seeked', this.onSeeked)
    video.addEventListener('timeupdate', this.onTimeUpdate)
    video.addEventListener('ended', this.onEnded)
    video.addEventListener('loadedmetadata', this.onLoadedMetadata)

    return new Promise<void>((resolve, reject) => {
      const onReady = (): void => {
        video.removeEventListener('loadedmetadata', onReady)
        video.removeEventListener('error', onError)
        if (Number.isFinite(video.duration)) {
          this.lastDuration = video.duration
        }
        const start = options.startAtSeconds ?? 0
        if (start > 0) {
          try {
            video.currentTime = start
          } catch {
            // ignore — readyState may block; the user can scrub manually
          }
        }
        resolve()
      }
      const onError = (): void => {
        video.removeEventListener('loadedmetadata', onReady)
        video.removeEventListener('error', onError)
        reject(new Error('Failed to load video source'))
      }
      video.addEventListener('loadedmetadata', onReady)
      video.addEventListener('error', onError)
    })
  }

  async destroy(): Promise<void> {
    const v = this.video
    if (v) {
      try {
        v.pause()
      } catch {
        // ignore — already paused or detached
      }
      v.removeEventListener('play', this.onPlay)
      v.removeEventListener('pause', this.onPause)
      v.removeEventListener('seeked', this.onSeeked)
      v.removeEventListener('timeupdate', this.onTimeUpdate)
      v.removeEventListener('ended', this.onEnded)
      v.removeEventListener('loadedmetadata', this.onLoadedMetadata)
      v.removeAttribute('src')
      v.load()
      if (this.container && v.parentNode === this.container) {
        this.container.removeChild(v)
      }
    }
    this.video = null
    this.container = null
    this.subscribers = emptySubscribers()
  }

  getCurrentTime(): number {
    return this.video?.currentTime ?? this.lastKnownTime
  }

  getDuration(): number | null {
    if (this.video && Number.isFinite(this.video.duration)) {
      return this.video.duration
    }
    return this.lastDuration
  }

  on<E extends VideoPlayerEvent>(event: E, handler: VideoPlayerEventHandler[E]): void {
    this.subscribers[event].add(handler)
  }

  off<E extends VideoPlayerEvent>(event: E, handler: VideoPlayerEventHandler[E]): void {
    this.subscribers[event].delete(handler)
  }

  async play(): Promise<void> {
    await this.video?.play()
  }

  async pause(): Promise<void> {
    this.video?.pause()
  }

  async seekTo(seconds: number): Promise<void> {
    if (this.video) {
      this.video.currentTime = seconds
    }
  }

  canAutoplay(): boolean {
    return true
  }

  private emit<E extends VideoPlayerEvent>(event: E, ...args: Parameters<VideoPlayerEventHandler[E]>): void {
    for (const handler of this.subscribers[event]) {
      (handler as (...a: unknown[]) => void)(...args)
    }
  }
}
