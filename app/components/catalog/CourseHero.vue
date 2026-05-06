<script setup lang="ts">
// CourseHero owns the hero strip for `/courses/[slug]`. The CTA's full
// state machine (label, color, disabled, click action) is computed here
// from the detail payload + the auth and enrollments Pinia stores.
//
// Phase 4.2 promotes the placeholder Enroll button to a real flow:
//   guest        → /login?return_to=<currentPath>
//   enrolled     → /dashboard (Continue / Review)
//   paid         → disabled, "оплата буде підключена пізніше"
//   closed       → disabled
//   not yet open → disabled, with formatted opens-at hint
//   ready        → POST /vl/v1/enrollments → toast + /dashboard
//
// The button SSR-renders so the page is interactive immediately. The
// reactive flip from "guest/ready" to "enrolled" happens after hydrate;
// a brief flash is accepted (DECISIONS.md note for Phase 4.2).

import type { CourseDetail } from '#shared/types/catalog'
import { formatDuration } from '~/utils/formatDuration'
import { formatPrice } from '~/utils/formatPrice'
import { formatScheduledDate } from '~/utils/formatScheduledDate'
import { resolveEnrollmentError } from '~/utils/resolveEnrollmentError'

interface Props {
  course: CourseDetail
  isAuthed: boolean
}

const props = defineProps<Props>()

const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const enrollmentsStore = useEnrollmentsStore()

const initial = computed(() => props.course.title.trim().charAt(0).toUpperCase())

const duration = computed(() => formatDuration(props.course.duration_hours, {
  hours: t('landing.duration.hours_short'),
  minutes: t('landing.duration.minutes_short')
}))

const priceLabel = computed(() => {
  if (props.course.price <= 0) {
    return { value: t('catalog.card.free'), free: true }
  }
  return { value: formatPrice(props.course.price, props.course.currency), free: false }
})

const startsAtLabel = computed(() => formatScheduledDate(
  props.course.starts_at,
  'scheduled',
  { completedPrefix: t('catalog.card.completed_prefix') }
))

const enrollmentClosesLabel = computed(() => formatScheduledDate(
  props.course.enrollment_closes_at,
  'scheduled',
  { completedPrefix: t('catalog.card.completed_prefix') }
))

const secondaryLine = computed<string>(() => {
  if (props.course.type === 'cohort') {
    if (startsAtLabel.value) {
      return t('landing.course.cohort_secondary.starts_at', { date: startsAtLabel.value })
    }
    if (enrollmentClosesLabel.value) {
      return t('landing.course.cohort_secondary.enrollment_closes_at', { date: enrollmentClosesLabel.value })
    }
    return ''
  }
  return t('landing.course.self_paced_secondary')
})

type CtaAction = 'login' | 'dashboard' | 'enroll' | 'checkout' | 'none'
type CtaColor = 'primary' | 'neutral'

interface CtaState {
  label: string
  disabled: boolean
  color: CtaColor
  action: CtaAction
}

const isLoading = ref(false)

const cta = computed<CtaState>(() => {
  // Process top-to-bottom; first match wins. Order mirrors the spec table.

  if (!props.isAuthed) {
    return {
      label: t('enrollment.cta.enroll'),
      disabled: false,
      color: 'primary',
      action: 'login'
    }
  }

  if (enrollmentsStore.hasActiveEnrollment(props.course.id)) {
    return {
      label: t('enrollment.cta.continue'),
      disabled: false,
      color: 'primary',
      action: 'dashboard'
    }
  }

  const existing = enrollmentsStore.getEnrollment(props.course.id)
  if (existing && existing.status === 'completed') {
    return {
      label: t('enrollment.cta.review'),
      disabled: false,
      color: 'neutral',
      action: 'dashboard'
    }
  }

  if (props.course.price > 0) {
    return {
      label: t('enrollment.cta.buy'),
      disabled: false,
      color: 'primary',
      action: 'checkout'
    }
  }

  if (!props.course.enrollment_open) {
    return {
      label: t('enrollment.cta.closed'),
      disabled: true,
      color: 'primary',
      action: 'none'
    }
  }

  // Date checks run on the client only via `Date.now()` after hydrate. On
  // SSR `now` is the server's UTC clock, which is acceptable here — the
  // window comparison is coarse-grained (hours, not seconds).
  const now = new Date()

  if (props.course.enrollment_opens_at) {
    const opensAt = new Date(props.course.enrollment_opens_at)
    if (!Number.isNaN(opensAt.getTime()) && now < opensAt) {
      const formatted = formatScheduledDate(
        props.course.enrollment_opens_at,
        'scheduled',
        { completedPrefix: t('catalog.card.completed_prefix') }
      )
      return {
        label: t('enrollment.cta.opens_at', { date: formatted }),
        disabled: true,
        color: 'primary',
        action: 'none'
      }
    }
  }

  if (props.course.enrollment_closes_at) {
    const closesAt = new Date(props.course.enrollment_closes_at)
    if (!Number.isNaN(closesAt.getTime()) && now > closesAt) {
      return {
        label: t('enrollment.cta.closed'),
        disabled: true,
        color: 'primary',
        action: 'none'
      }
    }
  }

  return {
    label: t('enrollment.cta.enroll'),
    disabled: false,
    color: 'primary',
    action: 'enroll'
  }
})

async function onCtaClick() {
  if (cta.value.disabled || isLoading.value) {
    return
  }

  switch (cta.value.action) {
    case 'login':
      await navigateTo({ path: '/login', query: { return_to: route.fullPath } })
      return
    case 'dashboard':
      await navigateTo('/dashboard')
      return
    case 'checkout':
      await navigateTo(`/checkout/${props.course.slug}?type=course`)
      return
    case 'enroll':
      await runEnroll()
      return
    case 'none':
    default:
      return
  }
}

async function runEnroll() {
  isLoading.value = true
  try {
    await enrollmentsStore.enroll(props.course.id)
    toast.add({
      title: t('enrollment.toast.enrolled'),
      color: 'success',
      icon: 'i-lucide-check'
    })
    await navigateTo('/dashboard')
  } catch (error) {
    toast.add({
      title: t('common.error_title'),
      description: t(resolveEnrollmentError(error)),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section class="grid gap-8 lg:grid-cols-2 lg:gap-x-12 lg:items-center">
    <div class="space-y-6">
      <CatalogBreadcrumbs
        type="courses"
        :category="course.categories[0] ?? null"
        :title="course.title"
      />

      <h1 class="text-4xl lg:text-5xl font-medium tracking-tight leading-tight">
        {{ course.title }}
      </h1>

      <p
        v-if="course.excerpt"
        class="text-lg text-muted leading-relaxed line-clamp-3"
      >
        {{ course.excerpt }}
      </p>

      <div class="flex flex-wrap items-center gap-2">
        <UBadge
          v-if="course.difficulty"
          color="neutral"
          variant="subtle"
          size="md"
        >
          {{ course.difficulty.name }}
        </UBadge>
        <UBadge
          color="neutral"
          variant="subtle"
          size="md"
        >
          {{ t(`landing.course.type.${course.type}`) }}
        </UBadge>
        <UBadge
          v-if="duration"
          color="neutral"
          variant="subtle"
          size="md"
          icon="i-lucide-clock"
        >
          {{ duration }}
        </UBadge>
        <UBadge
          v-if="course.type === 'cohort' && course.max_students > 0"
          color="neutral"
          variant="subtle"
          size="md"
          icon="i-lucide-users"
        >
          {{ t('landing.course.detail.max_students', { count: course.max_students }) }}
        </UBadge>
      </div>

      <div class="space-y-3 pt-2">
        <p
          class="text-2xl font-semibold"
          :class="priceLabel.free ? 'text-muted' : 'text-default'"
        >
          {{ priceLabel.value }}
        </p>
        <UButton
          :color="cta.color"
          size="xl"
          :disabled="cta.disabled"
          :loading="isLoading"
          icon="i-lucide-circle-plus"
          @click="onCtaClick"
        >
          {{ cta.label }}
        </UButton>
        <p
          v-if="secondaryLine"
          class="text-sm text-muted"
        >
          {{ secondaryLine }}
        </p>
      </div>
    </div>

    <div class="lg:col-start-2">
      <CatalogCardCover
        :cover="course.cover"
        fallback-icon="i-lucide-book-open"
        :fallback-initial="initial"
        loading="eager"
        sizes="sm:100vw lg:50vw"
      />
    </div>
  </section>
</template>
