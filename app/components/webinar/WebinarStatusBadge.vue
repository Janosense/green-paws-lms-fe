<script setup lang="ts">
import type { WebinarLifecycleStatus } from '#shared/types/webinar'

interface Props {
  status: WebinarLifecycleStatus
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), { size: 'md' })

const { t } = useI18n()

type Color = 'primary' | 'success' | 'neutral' | 'error'

const COLOR_MAP: Record<WebinarLifecycleStatus, Color> = {
  scheduled: 'primary',
  live: 'success',
  completed: 'neutral',
  cancelled: 'error'
}

const color = computed<Color>(() => COLOR_MAP[props.status])
const label = computed(() => t(`webinar.status.${props.status}`))
const isLive = computed(() => props.status === 'live')
</script>

<template>
  <UBadge
    :color="color"
    variant="subtle"
    :size="size"
    :class="{ 'animate-pulse': isLive }"
  >
    <span
      v-if="isLive"
      class="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current"
    />
    {{ label }}
  </UBadge>
</template>
