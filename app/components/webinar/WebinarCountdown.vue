<script setup lang="ts">
import { useNow } from '@vueuse/core'

interface Props {
  target: string
  format?: 'long' | 'short'
}

const props = withDefaults(defineProps<Props>(), { format: 'long' })

const emit = defineEmits<{
  expired: []
}>()

const { t } = useI18n()

// SSR safety: useNow on the server resolves once and the result drifts on
// hydration. Render a placeholder until the client takes over to avoid the
// hydration-mismatch warning Vue emits for time-dependent text.
const isClient = ref(false)
onMounted(() => {
  isClient.value = true
})

const now = useNow({ interval: 1000 })

const targetDate = computed(() => {
  const parsed = new Date(props.target)
  return Number.isNaN(parsed.getTime()) ? null : parsed
})

interface Delta {
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

const delta = computed<Delta | null>(() => {
  if (!targetDate.value) {
    return null
  }
  const diffMs = targetDate.value.getTime() - now.value.getTime()
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }
  const totalSeconds = Math.floor(diffMs / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false
  }
})

watch(
  () => delta.value?.expired === true,
  (isExpired) => {
    if (isExpired) {
      emit('expired')
    }
  }
)

const display = computed(() => {
  if (!delta.value || delta.value.expired) {
    return ''
  }
  if (props.format === 'short') {
    return t('webinar.countdown.short', {
      d: delta.value.days,
      h: delta.value.hours,
      m: delta.value.minutes
    })
  }
  return t('webinar.countdown.long', {
    days: delta.value.days,
    hours: delta.value.hours,
    minutes: delta.value.minutes
  })
})
</script>

<template>
  <span class="tabular-nums">
    <template v-if="!isClient">
      {{ t('common.loading') }}
    </template>
    <template v-else-if="delta?.expired">
      <slot name="expired">{{ t('webinar.countdown.expired') }}</slot>
    </template>
    <template v-else>
      {{ display }}
    </template>
  </span>
</template>
