// Adapter integration tree lives at app/lib/video/.
import type { VideoShape } from '#shared/types/learn'
import type {
  VideoPlayerAdapter,
  VideoPlayerEventHandler
} from '~/lib/video/types'

export interface UseVideoPlayerOptions {
  video: VideoShape
  startAtSeconds?: number
}

async function pickAdapterClass(provider: string): Promise<new () => VideoPlayerAdapter> {
  switch (provider) {
    case 'vimeo': return (await import('~/lib/video/VimeoAdapter')).VimeoAdapter
    case 'youtube': return (await import('~/lib/video/YouTubeAdapter')).YouTubeAdapter
    case 'file': return (await import('~/lib/video/FileAdapter')).FileAdapter
    case 'embed': return (await import('~/lib/video/EmbedAdapter')).EmbedAdapter
    default: throw new Error(`Unknown video provider: ${provider}`)
  }
}

/**
 * Phase 5.5 — instantiate a player adapter based on the lesson/topic's
 * VideoShape, mount it into the bound container, and expose lifecycle and
 * event subscription helpers. Pure runtime layer; the parent component
 * decides when to call initialize/teardown via Vue lifecycle hooks.
 */
export function useVideoPlayer(options: UseVideoPlayerOptions) {
  const containerRef = ref<HTMLElement | null>(null)
  const adapter = shallowRef<VideoPlayerAdapter | null>(null)
  const isReady = ref(false)
  const error = ref<Error | null>(null)

  async function initialize(): Promise<void> {
    if (!containerRef.value) return
    try {
      const AdapterCtor = await pickAdapterClass(options.video.provider)
      const instance = new AdapterCtor()
      await instance.mount(containerRef.value, {
        url: options.video.url,
        externalId: options.video.external_id,
        embedUrl: options.video.embed_url,
        startAtSeconds: options.startAtSeconds
      })
      adapter.value = instance
      isReady.value = true
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    }
  }

  async function teardown(): Promise<void> {
    isReady.value = false
    const current = adapter.value
    adapter.value = null
    if (current) {
      try {
        await current.destroy()
      } catch {
        // ignore — best-effort
      }
    }
  }

  function on<E extends keyof VideoPlayerEventHandler>(
    event: E,
    handler: VideoPlayerEventHandler[E]
  ): void {
    adapter.value?.on(event, handler)
  }

  function off<E extends keyof VideoPlayerEventHandler>(
    event: E,
    handler: VideoPlayerEventHandler[E]
  ): void {
    adapter.value?.off(event, handler)
  }

  return {
    containerRef,
    adapter,
    isReady: readonly(isReady),
    error: readonly(error),
    initialize,
    teardown,
    on,
    off
  }
}
