<script setup lang="ts">
import { useNow } from '@vueuse/core'
import type { CurriculumSessionNode } from '#shared/types/learn'

interface Props {
  session: CurriculumSessionNode
  isCurrent: boolean
}

const { session, isCurrent } = defineProps<Props>()
const { t } = useI18n()

const path = computed(() => `/learn/sessions/${session.slug}`)

const now = useNow({ interval: 60_000 })
const isClient = ref(false)
onMounted(() => {
  isClient.value = true
})

interface Visual {
  icon: string
  colorClass: string
  pulse: boolean
  hintKey: string | null
  lineThrough: boolean
}

const visual = computed<Visual>(() => {
  if (session.status === 'cancelled') {
    return {
      icon: 'i-lucide-circle-x',
      colorClass: 'text-muted',
      pulse: false,
      hintKey: 'learn.session.rail_status.cancelled',
      lineThrough: true
    }
  }
  if (session.status === 'live') {
    return {
      icon: 'i-lucide-radio',
      colorClass: 'text-success',
      pulse: true,
      hintKey: 'learn.session.rail_status.live',
      lineThrough: false
    }
  }
  if (session.status === 'completed') {
    if (session.is_completed) {
      return {
        icon: 'i-lucide-check-circle',
        colorClass: 'text-success',
        pulse: false,
        hintKey: 'learn.session.rail_status.completed_attended',
        lineThrough: false
      }
    }
    if (session.recording_url_path) {
      return {
        icon: 'i-lucide-play-circle',
        colorClass: 'text-primary',
        pulse: false,
        hintKey: 'learn.session.rail_status.completed_recording_available',
        lineThrough: false
      }
    }
    return {
      icon: 'i-lucide-circle-slash',
      colorClass: 'text-muted',
      pulse: false,
      hintKey: 'learn.session.rail_status.completed_no_recording',
      lineThrough: false
    }
  }
  // scheduled
  return {
    icon: 'i-lucide-calendar-clock',
    colorClass: 'text-muted',
    pulse: false,
    hintKey: 'learn.session.rail_status.scheduled',
    lineThrough: false
  }
})

const sessionLabel = computed(() => t('learn.session.session_number', { n: session.session_number }))

const relativeLine = computed(() => {
  if (!isClient.value || session.status !== 'scheduled' || !session.scheduled_start) {
    return ''
  }
  const target = new Date(session.scheduled_start)
  if (Number.isNaN(target.getTime())) return ''
  const diffMs = target.getTime() - now.value.getTime()
  if (diffMs <= 0) return ''
  const totalMinutes = Math.floor(diffMs / 60_000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  if (days > 0) {
    return t('webinar.countdown.short', { d: days, h: hours, m: totalMinutes % 60 })
  }
  return t('webinar.countdown.short', { d: 0, h: hours, m: totalMinutes % 60 })
})
</script>

<template>
  <NuxtLink
    :to="path"
    class="flex items-center gap-2 ps-3 pe-3 py-2 text-sm rounded-md transition-colors"
    :class="[
      isCurrent
        ? 'bg-primary-50 dark:bg-primary-950 text-primary font-medium'
        : 'text-default hover:bg-elevated'
    ]"
    :aria-current="isCurrent ? 'page' : undefined"
  >
    <UIcon
      :name="visual.icon"
      class="size-4 shrink-0"
      :class="[visual.colorClass, { 'animate-pulse': visual.pulse }]"
    />
    <span
      class="truncate flex-1"
      :class="{ 'line-through': visual.lineThrough }"
    >
      <span class="text-xs text-muted">{{ sessionLabel }}</span>
      <span class="ms-1">{{ session.title }}</span>
    </span>
    <span
      v-if="relativeLine"
      class="text-xs text-muted shrink-0"
    >
      {{ relativeLine }}
    </span>
  </NuxtLink>
</template>
