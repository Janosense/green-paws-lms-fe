<script setup lang="ts">
import { useNow } from '@vueuse/core'
import type { SessionDetailResponse } from '#shared/types/learn'
import { formatInSourceOffset } from '~/utils/formatInSourceOffset'
import { formatScheduledDate } from '~/utils/formatScheduledDate'

interface Props {
  detail: SessionDetailResponse
}

const { detail } = defineProps<Props>()
const { t } = useI18n()

const session = computed(() => detail.session)
const computedBlock = computed(() => detail.computed)

const now = useNow({ interval: 30_000 })

const sessionLabel = computed(() => t('learn.session.session_number', { n: session.value.session_number }))

const dateLine = computed(() => formatScheduledDate(
  session.value.scheduled_start,
  session.value.status,
  { completedPrefix: t('catalog.card.completed_prefix') }
))

const isCancelled = computed(() => session.value.status === 'cancelled')
const isPast = computed(() => computedBlock.value.is_past)
const joinWindowOpen = computed(() => computedBlock.value.join_window_open)
const recordingAvailable = computed(() => computedBlock.value.recording_available)

const recordingPostWindow = computed(() => {
  const until = session.value.recording_available_until
  if (!until) return false
  const date = new Date(until)
  if (Number.isNaN(date.getTime())) return false
  return now.value > date
})

// Recording state exhaustively split for the past-but-not-recording UI:
const recordingNoneOffered = computed(() =>
  isPast.value && !recordingAvailable.value
  && !session.value.recording_available_until && !recordingPending.value
)
const recordingPending = computed(() =>
  isPast.value && !recordingAvailable.value
  && !!session.value.recording_available_until && !recordingPostWindow.value
)
const recordingExpired = computed(() =>
  isPast.value && !recordingAvailable.value && recordingPostWindow.value
)

const joinRedirectPath = computed(() => `/vl/v1/learn/sessions/${session.value.slug}/join`)
const recordingRedirectPath = computed(() => `/vl/v1/learn/sessions/${session.value.slug}/recording`)

const joinOpensInline = computed(() => {
  if (isPast.value || joinWindowOpen.value || isCancelled.value) return ''
  const opensAt = computedBlock.value.join_opens_at
  if (!opensAt) return ''
  const formatted = formatInSourceOffset(opensAt, 'uk-UA', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  if (formatted === null) return ''
  return t('learn.session.join_window_will_open_at', { date: formatted })
})

const recordingExpiredLine = computed(() => {
  const until = session.value.recording_available_until
  if (!until) return ''
  const formatted = formatInSourceOffset(until, 'uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  if (formatted === null) return ''
  return t('learn.session.recording_window_expired', { date: formatted })
})
</script>

<template>
  <div class="space-y-8">
    <header class="space-y-3">
      <p class="text-xs uppercase tracking-wider text-muted">
        {{ sessionLabel }}
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-3xl font-medium tracking-tight">
          {{ session.title }}
        </h1>
        <EventStatusBadge :status="session.status" />
        <UBadge
          v-if="isPast && computedBlock.user_attended"
          color="success"
          variant="subtle"
          icon="i-lucide-check"
          size="sm"
        >
          {{ t('learn.session.user_attended_badge') }}
        </UBadge>
      </div>
      <p
        v-if="dateLine"
        class="text-base text-muted"
      >
        {{ dateLine }}
      </p>
    </header>

    <UAlert
      v-if="isCancelled"
      color="error"
      variant="subtle"
      icon="i-lucide-x-circle"
      :title="t('learn.session.session_cancelled')"
    />

    <section
      v-else-if="!isPast"
      class="space-y-3 rounded-lg border border-default p-5"
    >
      <div
        v-if="joinWindowOpen"
        class="flex flex-wrap items-center gap-3"
      >
        <UBadge
          color="success"
          variant="solid"
          class="animate-pulse"
        >
          <span class="me-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />
          {{ t('learn.session.live_now_banner') }}
        </UBadge>
        <EventJoinButton
          :redirect-path="joinRedirectPath"
          :label-key="'learn.session.join_button'"
          size="lg"
        />
      </div>
      <div v-else>
        <p
          v-if="session.scheduled_start"
          class="text-2xl font-semibold tabular-nums"
        >
          <EventCountdown
            :target="session.scheduled_start"
            format="long"
          />
        </p>
        <p
          v-if="joinOpensInline"
          class="text-sm text-muted"
        >
          {{ joinOpensInline }}
        </p>
      </div>
    </section>

    <section
      v-else
      class="space-y-3 rounded-lg border border-default p-5"
    >
      <p class="text-sm text-muted">
        {{ t('learn.session.session_completed') }}
      </p>
      <EventRecordingButton
        v-if="recordingAvailable"
        :redirect-path="recordingRedirectPath"
        :label-key="'learn.session.watch_recording_button'"
        size="lg"
      />
      <p
        v-else-if="recordingPending"
        class="text-sm text-muted"
      >
        {{ t('learn.session.recording_pending') }}
      </p>
      <p
        v-else-if="recordingExpired"
        class="text-sm text-muted"
      >
        {{ recordingExpiredLine }}
      </p>
      <p
        v-else-if="recordingNoneOffered"
        class="text-sm text-muted"
      >
        {{ t('learn.session.recording_not_offered') }}
      </p>
    </section>

    <WebinarMaterials
      v-if="session.materials.length > 0"
      :materials="session.materials"
    />

    <div>
      <UButton
        :to="`/courses/${session.course_slug}`"
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
        size="sm"
      >
        {{ t('learn.session.back_to_course') }}
      </UButton>
    </div>
  </div>
</template>
