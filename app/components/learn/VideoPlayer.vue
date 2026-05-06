<script setup lang="ts">
import type { VideoShape } from '#shared/types/learn'
import type { VideoPlayerAdapter } from '~/lib/video/types'

interface Props {
  video: VideoShape
  startAtSeconds?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  ready: [adapter: VideoPlayerAdapter]
  error: [err: Error]
}>()

const { t } = useI18n()

const { containerRef, adapter, isReady, error, initialize, teardown } = useVideoPlayer({
  video: props.video,
  startAtSeconds: props.startAtSeconds
})

const pipFrameRef = ref<HTMLElement | null>(null)
const { isPipActive, dismiss: dismissPip } = useVideoPiP(pipFrameRef)

watch(isReady, (ready) => {
  if (ready && adapter.value) emit('ready', adapter.value)
})
watch(error, (e) => {
  if (e) emit('error', e)
})

onMounted(() => {
  void initialize()
})
onBeforeUnmount(() => {
  void teardown()
})
</script>

<template>
  <div
    ref="pipFrameRef"
    class="not-prose mb-6 aspect-video"
  >
    <div
      :class="[
        'aspect-video bg-elevated rounded-lg overflow-hidden border border-default relative',
        isPipActive ? 'vl-pip-active' : 'w-full h-full'
      ]"
    >
      <div
        ref="containerRef"
        class="w-full h-full"
      />
      <div
        v-if="!isReady && !error"
        class="absolute inset-0 flex items-center justify-center"
      >
        <USkeleton class="w-full h-full" />
      </div>
      <div
        v-if="error"
        class="absolute inset-0 flex items-center justify-center p-4"
      >
        <p class="text-sm text-muted text-center">
          {{ t('learn.player.error.load_failed') }}
        </p>
      </div>
      <button
        v-if="isPipActive"
        type="button"
        class="vl-pip-close"
        :aria-label="t('learn.player.pip.close')"
        @click="dismissPip"
      >
        ×
      </button>
    </div>
  </div>
</template>

<style scoped>
.vl-pip-active {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 240px;
  height: 135px;
  z-index: 1000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  transition: bottom 0.2s ease, right 0.2s ease;
}

.vl-pip-close {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: 0;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  z-index: 1;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 767px) {
  .vl-pip-active {
    position: static;
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
    box-shadow: none;
  }
}
</style>
