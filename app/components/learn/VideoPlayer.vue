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
  <div class="not-prose mb-6">
    <div
      ref="containerRef"
      class="aspect-video bg-elevated rounded-lg overflow-hidden border border-default relative"
    >
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
    </div>
  </div>
</template>
