<script setup lang="ts">
// CourseHero owns the hero strip for `/courses/[slug]`. The CTA's *state*
// (label / disabled) is computed here from the detail payload + an
// `is-authed` prop; the active path emits `cta-click` so the page can run
// auth-aware navigation or fire the placeholder toast. Two heros (course
// and webinar) instead of one with conditional soup — they diverge enough
// that a single component would obscure the visual structure.

import type { CourseDetail } from '#shared/types/catalog'
import { formatDuration } from '~/utils/formatDuration'
import { formatPrice } from '~/utils/formatPrice'
import { formatScheduledDate } from '~/utils/formatScheduledDate'

interface Props {
  course: CourseDetail
  isAuthed: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'cta-click': []
}>()

const { t } = useI18n()

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

interface CtaState {
  label: string
  disabled: boolean
}

const cta = computed<CtaState>(() => {
  if (!props.course.enrollment_open) {
    return { label: t('landing.course.cta.closed'), disabled: true }
  }
  return { label: t('landing.course.cta.enroll'), disabled: false }
})

function onCtaClick() {
  if (!cta.value.disabled) {
    emit('cta-click')
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
          color="primary"
          size="xl"
          :disabled="cta.disabled"
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
      />
    </div>
  </section>
</template>
