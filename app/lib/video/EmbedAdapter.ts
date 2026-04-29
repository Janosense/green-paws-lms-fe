import type {
  VideoPlayerAdapter,
  VideoPlayerEvent,
  VideoPlayerEventHandler,
  VideoPlayerMountOptions
} from './types'

/**
 * Opaque iframe embed. Tracks nothing, emits nothing — `view_start` is the
 * only event the parent tracker can emit for this provider. The Mark
 * Complete button still works because it lives outside the player.
 */
export class EmbedAdapter implements VideoPlayerAdapter {
  private container: HTMLElement | null = null
  private iframe: HTMLIFrameElement | null = null

  async mount(container: HTMLElement, options: VideoPlayerMountOptions): Promise<void> {
    this.container = container

    const iframe = document.createElement('iframe')
    iframe.src = options.embedUrl ?? options.url
    iframe.referrerPolicy = 'strict-origin-when-cross-origin'
    iframe.loading = 'lazy'
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
    iframe.setAttribute('allowfullscreen', '')
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = '0'

    container.appendChild(iframe)
    this.iframe = iframe
  }

  async destroy(): Promise<void> {
    if (this.iframe && this.container) {
      this.container.removeChild(this.iframe)
    }
    this.iframe = null
    this.container = null
  }

  getCurrentTime(): number {
    return 0
  }

  getDuration(): number | null {
    return null
  }

  on<E extends VideoPlayerEvent>(_event: E, _handler: VideoPlayerEventHandler[E]): void {
    // No-op: iframe embeds do not surface events.
  }

  off<E extends VideoPlayerEvent>(_event: E, _handler: VideoPlayerEventHandler[E]): void {
    // No-op.
  }

  async play(): Promise<void> {
    // No-op: we don't control the iframe.
  }

  async pause(): Promise<void> {
    // No-op.
  }

  async seekTo(_seconds: number): Promise<void> {
    // No-op.
  }

  canAutoplay(): boolean {
    return false
  }
}
