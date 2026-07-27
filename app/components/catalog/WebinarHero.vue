<script setup lang="ts">
// Phase 7.5 — the placeholder CTA from Phase 3.4 is now backed by the real
// state machine in `useWebinarStateMachine`. The component owns the
// register/re-register flow end-to-end so the public landing page is a
// thin wrapper around `<WebinarHero>` and the marketing sections.

import { useNow } from '@vueuse/core'
import type { WebinarDetail, WebinarStatus } from '#shared/types/catalog'
import { useWebinarStateMachine, type WebinarCtaState } from '~/composables/useWebinarStateMachine'
import { formatInSourceOffset } from '~/utils/formatInSourceOffset'
import { formatPrice } from '~/utils/formatPrice'
import { formatRelativeDate } from '~/utils/formatRelativeDate'
import { formatScheduledDate } from '~/utils/formatScheduledDate'
import { resolveWebinarError } from '~/utils/resolveWebinarError'

interface Props {
  webinar: WebinarDetail
  isAuthed: boolean
}

const props = defineProps<Props>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const store = useWebinarRegistrationsStore()

const STATUS_COLORS: Record<WebinarStatus, 'primary' | 'error' | 'neutral'> = {
  scheduled: 'primary',
  live: 'error',
  completed: 'neutral',
  cancelled: 'neutral'
}

const initial = computed(() => props.webinar.title.trim().charAt(0).toUpperCase())

const dateLine = computed(() => formatScheduledDate(
  props.webinar.scheduled_start,
  props.webinar.status,
  { completedPrefix: t('catalog.card.completed_prefix') }
))

const relativeLine = computed(() => formatRelativeDate(
  props.webinar.scheduled_start,
  new Date(),
  {
    today: t('landing.relative_date.today'),
    tomorrow: t('landing.relative_date.tomorrow'),
    daysFuture: days => t('landing.relative_date.days_future', { days }),
    daysPast: days => t('landing.relative_date.days_past', { days })
  }
))

const statusLabel = computed(() => t(`catalog.card.webinar_status.${props.webinar.status}`))

const priceLabel = computed(() => {
  if (props.webinar.price <= 0) {
    return { value: t('catalog.card.free'), free: true }
  }
  return { value: formatPrice(props.webinar.price, props.webinar.currency), free: false }
})

// Paid webinar + any local registration record (active or cancelled) means
// the user already paid; cancellation doesn't undo the purchase. Free
// registrations stay on the price line, which already shows "Безкоштовно".
const isPurchased = computed(() =>
  props.webinar.price > 0 && store.getRegistration(props.webinar.slug) !== null
)

const now = useNow({ interval: 1000 })
const capacityReached = ref(false)

const state = computed<WebinarCtaState>(() => useWebinarStateMachine({
  webinar: props.webinar,
  registration: store.getRegistration(props.webinar.slug),
  isAuthenticated: props.isAuthed,
  now: now.value,
  capacityReached: capacityReached.value
}))

const opensAtFormatted = computed(() => {
  if (state.value.kind !== 'registration_not_open_yet') return ''
  return formatInSourceOffset(state.value.opensAt, 'uk-UA', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) ?? ''
})

interface CtaUi {
  labelKey: string
  labelArgs?: Record<string, unknown>
  icon: string
  disabled: boolean
  loading: boolean
  /** Optional inline tooltip-style helper text rendered below the button. */
  helperKey?: string
  variant?: 'register' | 're_register' | 'join' | 'recording' | 'detail' | 'login' | 'paid' | 'disabled'
}

const registerLoading = ref(false)

const ctaUi = computed<CtaUi>(() => {
  switch (state.value.kind) {
    case 'guest':
      return { labelKey: 'webinar.cta.guest', icon: 'i-lucide-log-in', disabled: false, loading: false, variant: 'login' }
    case 'paid_blocked':
      return {
        labelKey: 'webinar.cta.paid_blocked',
        icon: 'i-lucide-credit-card',
        disabled: false,
        loading: false,
        variant: 'paid'
      }
    case 'registration_not_open_yet':
      return {
        labelKey: 'webinar.cta.registration_not_open_yet',
        labelArgs: { date: opensAtFormatted.value },
        icon: 'i-lucide-clock',
        disabled: true,
        loading: false,
        variant: 'disabled'
      }
    case 'registration_closed':
      return { labelKey: 'webinar.cta.registration_closed', icon: 'i-lucide-x', disabled: true, loading: false, variant: 'disabled' }
    case 'capacity_reached':
      return { labelKey: 'webinar.cta.capacity_reached', icon: 'i-lucide-users', disabled: true, loading: false, variant: 'disabled' }
    case 'register_ready':
      return { labelKey: 'webinar.cta.register_ready', icon: 'i-lucide-calendar-plus', disabled: false, loading: registerLoading.value, variant: 'register' }
    case 'registered_pending':
      return { labelKey: 'webinar.cta.registered_pending', icon: 'i-lucide-check', disabled: false, loading: false, variant: 'detail' }
    case 'registered_join_window':
      return { labelKey: 'webinar.cta.registered_join_window', icon: 'i-lucide-video', disabled: false, loading: false, variant: 'join' }
    case 'registered_past_recording_available':
      return { labelKey: 'webinar.cta.registered_past_recording_available', icon: 'i-lucide-play-circle', disabled: false, loading: false, variant: 'recording' }
    case 'registered_past_no_recording':
      return { labelKey: 'webinar.cta.registered_past_no_recording', icon: 'i-lucide-flag', disabled: true, loading: false, variant: 'disabled' }
    case 'registered_past_window_expired':
      return { labelKey: 'webinar.cta.registered_past_window_expired', icon: 'i-lucide-clock', disabled: true, loading: false, variant: 'disabled' }
    case 'cancelled_registration_can_re_register':
      return { labelKey: 'webinar.cta.cancelled_registration_can_re_register', icon: 'i-lucide-calendar-plus', disabled: false, loading: registerLoading.value, variant: 're_register' }
    case 'session_cancelled':
      return { labelKey: 'webinar.cta.session_cancelled', icon: 'i-lucide-x-circle', disabled: true, loading: false, variant: 'disabled' }
  }
  return { labelKey: 'webinar.cta.registration_closed', icon: 'i-lucide-x', disabled: true, loading: false, variant: 'disabled' }
})

const ctaLabel = computed(() => t(ctaUi.value.labelKey, ctaUi.value.labelArgs ?? {}))

async function performRegister(successKey: string): Promise<void> {
  if (registerLoading.value) return
  registerLoading.value = true
  try {
    await store.register(props.webinar.slug)
    capacityReached.value = false
    toast.add({
      title: t(successKey),
      color: 'success',
      icon: 'i-lucide-check'
    })
    void router.push('/dashboard/webinars')
  } catch (caught) {
    const resolved = resolveWebinarError(caught)
    if (resolved.key === 'webinar.errors.capacity_reached') {
      capacityReached.value = true
    }
    toast.add({
      title: t(resolved.key),
      color: 'error',
      icon: 'i-lucide-alert-triangle'
    })
  } finally {
    registerLoading.value = false
  }
}

async function onCtaClick(): Promise<void> {
  switch (state.value.kind) {
    case 'guest':
      await router.push({ path: '/login', query: { return_to: route.fullPath } })
      return
    case 'paid_blocked':
      await router.push(`/checkout/${props.webinar.slug}?type=webinar`)
      return
    case 'register_ready':
      await performRegister('webinar.register_success')
      return
    case 'cancelled_registration_can_re_register':
      await performRegister('webinar.re_register_success')
      return
    case 'registered_pending':
      await router.push(`/dashboard/webinars/${props.webinar.slug}`)
      return
    default:
      // disabled / handled by sub-button slots
      return
  }
}
</script>

<template>
  <section class="grid gap-8 lg:grid-cols-2 lg:gap-x-12 lg:items-center">
    <div class="space-y-6">
      <CatalogBreadcrumbs
        type="webinars"
        :category="webinar.categories[0] ?? null"
        :title="webinar.title"
      />

      <h1 class="text-4xl lg:text-5xl font-medium tracking-tight leading-tight">
        {{ webinar.title }}
      </h1>

      <p
        v-if="webinar.excerpt"
        class="text-lg text-muted leading-relaxed line-clamp-3"
      >
        {{ webinar.excerpt }}
      </p>

      <div class="flex flex-wrap items-center gap-2">
        <UBadge
          :color="STATUS_COLORS[webinar.status]"
          variant="solid"
          size="md"
        >
          {{ statusLabel }}
        </UBadge>
        <UBadge
          v-if="webinar.categories[0]"
          color="neutral"
          variant="subtle"
          size="md"
        >
          {{ webinar.categories[0].name }}
        </UBadge>
        <UBadge
          v-if="webinar.recording_offered"
          color="neutral"
          variant="subtle"
          size="md"
          icon="i-lucide-video"
        >
          {{ t('landing.webinar.recording_badge', { days: webinar.recording_access_days }) }}
        </UBadge>
      </div>

      <div class="space-y-3 pt-2">
        <p
          v-if="dateLine"
          class="text-2xl font-semibold text-default"
        >
          {{ dateLine }}
        </p>
        <p
          v-if="relativeLine"
          class="text-sm text-muted"
        >
          {{ relativeLine }}
        </p>
        <div v-if="isPurchased">
          <UBadge
            color="success"
            variant="subtle"
            size="lg"
            icon="i-lucide-check-circle"
          >
            {{ t('webinar.purchased') }}
          </UBadge>
        </div>
        <p
          v-else
          class="text-2xl font-semibold"
          :class="priceLabel.free ? 'text-muted' : 'text-default'"
        >
          {{ priceLabel.value }}
        </p>

        <!-- Join / Recording use the dedicated redirect-aware buttons.
             Everything else funnels through the unified `onCtaClick`. -->
        <EventJoinButton
          v-if="state.kind === 'registered_join_window'"
          :redirect-path="`/vl/v1/webinars/${webinar.slug}/join`"
          size="xl"
        />
        <EventRecordingButton
          v-else-if="state.kind === 'registered_past_recording_available'"
          :redirect-path="`/vl/v1/webinars/${webinar.slug}/recording`"
          size="xl"
        />
        <UButton
          v-else
          color="primary"
          size="xl"
          :icon="ctaUi.icon"
          :disabled="ctaUi.disabled"
          :loading="ctaUi.loading"
          @click="onCtaClick"
        >
          {{ ctaLabel }}
        </UButton>

        <UButton
          v-if="state.kind === 'registered_pending' || state.kind === 'registered_join_window' || state.kind === 'registered_past_recording_available'"
          :to="`/dashboard/webinars/${webinar.slug}`"
          color="neutral"
          variant="ghost"
          size="md"
          icon="i-lucide-arrow-right"
        >
          {{ t('webinar.go_to_dashboard') }}
        </UButton>

        <p
          v-if="ctaUi.helperKey"
          class="text-xs text-muted"
        >
          {{ t(ctaUi.helperKey) }}
        </p>
      </div>
    </div>

    <div class="lg:col-start-2">
      <CatalogCardCover
        :cover="webinar.cover"
        fallback-icon="i-lucide-radio"
        :fallback-initial="initial"
        loading="eager"
        sizes="sm:100vw lg:50vw"
      />
    </div>
  </section>
</template>
