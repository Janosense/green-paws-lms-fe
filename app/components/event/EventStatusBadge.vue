<script setup lang="ts">
import type { WebinarLifecycleStatus } from '#shared/types/webinar'

/**
 * Phase 7.6: extracted from `WebinarStatusBadge`. The lifecycle enum is the
 * same shape for `vl_session` and `vl_webinar` posts (`scheduled` / `live`
 * / `completed` / `cancelled`); the badge knows nothing about what's behind
 * the status, only how to render it.
 *
 * The labels still come from `webinar.status.*` i18n keys — the literal
 * mapping is webinar-derived but applies equally to sessions; the
 * `learn.session.rail_status.*` keys serve a different (rail-row-specific)
 * surface and are not consumed here.
 */

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
