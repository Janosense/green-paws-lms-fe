<script setup lang="ts">
import type { WebinarRegistrationRecord } from '#shared/types/webinar'
import { formatScheduledDate } from '~/utils/formatScheduledDate'

interface Props {
  registration: WebinarRegistrationRecord
}

const { registration } = defineProps<Props>()

const { t } = useI18n()

const slug = computed(() => registration.webinar.slug)
const detailPath = computed(() => `/dashboard/webinars/${slug.value}`)
const titleInitial = computed(() => registration.webinar.title.trim().charAt(0).toUpperCase())

const isPast = computed(() => registration.computed.is_past)
const isCancelled = computed(() => registration.status === 'cancelled')
const isJoinWindowOpen = computed(
  () => registration.status === 'active' && !isPast.value && registration.computed.join_window_open
)
const recordingAvailable = computed(
  () => registration.status === 'active' && isPast.value && registration.computed.recording_available
)
const showCountdown = computed(
  () => registration.status === 'active' && !isPast.value && !isJoinWindowOpen.value
    && !!registration.webinar.scheduled_start
)

const dateLine = computed(() => formatScheduledDate(
  registration.webinar.scheduled_start,
  registration.webinar.status,
  { completedPrefix: t('catalog.card.completed_prefix') }
))
</script>

<template>
  <UCard>
    <div class="grid gap-4 md:grid-cols-[8rem_1fr] md:items-start">
      <CatalogCardCover
        :cover="registration.webinar.cover"
        fallback-icon="i-lucide-radio"
        :fallback-initial="titleInitial"
      />

      <div class="space-y-3">
        <div class="space-y-1">
          <h3 class="text-base font-medium leading-snug line-clamp-2">
            <NuxtLink
              :to="detailPath"
              class="hover:text-primary focus-visible:outline-none focus-visible:text-primary"
            >
              {{ registration.webinar.title }}
            </NuxtLink>
          </h3>
          <p
            v-if="dateLine"
            class="text-sm text-muted"
          >
            {{ dateLine }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <EventStatusBadge
            :status="registration.webinar.status"
            size="sm"
          />
          <UBadge
            v-if="isCancelled"
            color="neutral"
            variant="subtle"
            size="sm"
            icon="i-lucide-x"
          >
            {{ t('webinar.section.cancelled') }}
          </UBadge>
          <span
            v-if="showCountdown"
            class="text-xs text-muted"
          >
            <EventCountdown
              :target="registration.webinar.scheduled_start as string"
              format="short"
            />
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-2 pt-1">
          <EventJoinButton
            v-if="isJoinWindowOpen"
            :redirect-path="`/vl/v1/webinars/${slug}/join`"
            size="sm"
          />
          <EventRecordingButton
            v-else-if="recordingAvailable"
            :redirect-path="`/vl/v1/webinars/${slug}/recording`"
            size="sm"
          />
          <UButton
            v-else-if="!isCancelled && !isPast"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-arrow-right"
            :to="detailPath"
          >
            {{ t('common.continue') }}
          </UButton>

          <UButton
            v-if="!isCancelled"
            color="neutral"
            variant="ghost"
            size="sm"
            :to="detailPath"
            icon="i-lucide-info"
          >
            {{ t('webinar.detail_link') }}
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
