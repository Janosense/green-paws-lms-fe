<script setup lang="ts">
import type { CardTerm, CatalogType, CourseDetail, WebinarDetail } from '#shared/types/catalog'
import { formatDuration } from '~/utils/formatDuration'
import { formatScheduledDate } from '~/utils/formatScheduledDate'

type Props
  = | { type: 'courses', course: CourseDetail }
    | { type: 'webinars', webinar: WebinarDetail }

const props = defineProps<Props>()
const { t } = useI18n()

interface Row {
  label: string
  text?: string
  links?: Array<{ to: string, label: string }>
}

function formatIso(iso: string | null): string {
  return formatScheduledDate(
    iso,
    'scheduled',
    { completedPrefix: t('catalog.card.completed_prefix') }
  )
}

function durationText(hours: number): string {
  return formatDuration(hours, {
    hours: t('landing.duration.hours_short'),
    minutes: t('landing.duration.minutes_short')
  })
}

function termsToLinks(type: CatalogType, facet: 'categories' | 'specialties' | 'tags', terms: CardTerm[]): Row['links'] {
  if (terms.length === 0) {
    return undefined
  }
  return terms.map(term => ({
    to: `/${type}?${facet}=${term.slug}`,
    label: term.name
  }))
}

function webinarDuration(start: string | null, end: string | null): string {
  if (!start || !end) {
    return ''
  }
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return ''
  }
  const hours = (endMs - startMs) / (1000 * 60 * 60)
  return durationText(hours)
}

function webinarRegistrationWindow(opens: string | null, closes: string | null): string {
  const openLabel = formatIso(opens)
  const closeLabel = formatIso(closes)
  if (openLabel && closeLabel) {
    return `${openLabel} – ${closeLabel}`
  }
  if (openLabel) {
    return openLabel
  }
  if (closeLabel) {
    return closeLabel
  }
  return ''
}

const courseRows = computed<Row[]>(() => {
  if (props.type !== 'courses') {
    return []
  }
  const c = props.course
  const out: Row[] = []
  out.push({ label: t('landing.course.detail.type'), text: t(`landing.course.type.${c.type}`) })
  const dur = durationText(c.duration_hours)
  if (dur) {
    out.push({ label: t('landing.course.detail.duration'), text: dur })
  }
  if (c.difficulty) {
    out.push({ label: t('landing.course.detail.difficulty'), text: c.difficulty.name })
  }
  if (c.certificate_enabled) {
    out.push({
      label: t('landing.course.detail.certificate'),
      text: c.passing_threshold !== null && c.passing_threshold > 0
        ? t('landing.course.detail.certificate_yes_with_threshold', { threshold: c.passing_threshold })
        : t('landing.course.detail.certificate_yes')
    })
  } else {
    out.push({ label: t('landing.course.detail.certificate'), text: t('landing.course.detail.certificate_no') })
  }
  if (c.type === 'cohort') {
    const enrollOpens = formatIso(c.enrollment_opens_at)
    if (enrollOpens) {
      out.push({ label: t('landing.course.detail.enrollment_opens_at'), text: enrollOpens })
    }
    const enrollCloses = formatIso(c.enrollment_closes_at)
    if (enrollCloses) {
      out.push({ label: t('landing.course.detail.enrollment_closes_at'), text: enrollCloses })
    }
    const starts = formatIso(c.starts_at)
    if (starts) {
      out.push({ label: t('landing.course.detail.starts_at'), text: starts })
    }
    const ends = formatIso(c.ends_at)
    if (ends) {
      out.push({ label: t('landing.course.detail.ends_at'), text: ends })
    }
  }
  const cats = termsToLinks('courses', 'categories', c.categories)
  if (cats) {
    out.push({ label: t('landing.course.detail.categories'), links: cats })
  }
  const specs = termsToLinks('courses', 'specialties', c.specialties)
  if (specs) {
    out.push({ label: t('landing.course.detail.specialties'), links: specs })
  }
  const tags = termsToLinks('courses', 'tags', c.tags)
  if (tags) {
    out.push({ label: t('landing.course.detail.tags'), links: tags })
  }
  return out
})

const webinarRows = computed<Row[]>(() => {
  if (props.type !== 'webinars') {
    return []
  }
  const w = props.webinar
  const out: Row[] = []
  const date = formatScheduledDate(w.scheduled_start, w.status, {
    completedPrefix: t('catalog.card.completed_prefix')
  })
  if (date) {
    out.push({ label: t('landing.webinar.detail.date'), text: date })
  }
  const dur = webinarDuration(w.scheduled_start, w.scheduled_end)
  if (dur) {
    out.push({ label: t('landing.webinar.detail.duration'), text: dur })
  }
  if (w.difficulty) {
    out.push({ label: t('landing.course.detail.difficulty'), text: w.difficulty.name })
  }
  out.push({
    label: t('landing.webinar.detail.recording_label'),
    text: w.recording_offered
      ? t('landing.webinar.detail.recording_yes', { days: w.recording_access_days })
      : t('landing.webinar.detail.recording_no')
  })
  const reg = webinarRegistrationWindow(w.registration_opens_at, w.registration_closes_at)
  if (reg) {
    out.push({ label: t('landing.webinar.detail.registration'), text: reg })
  }
  const cats = termsToLinks('webinars', 'categories', w.categories)
  if (cats) {
    out.push({ label: t('landing.webinar.detail.categories'), links: cats })
  }
  const specs = termsToLinks('webinars', 'specialties', w.specialties)
  if (specs) {
    out.push({ label: t('landing.webinar.detail.specialties'), links: specs })
  }
  const tags = termsToLinks('webinars', 'tags', w.tags)
  if (tags) {
    out.push({ label: t('landing.webinar.detail.tags'), links: tags })
  }
  return out
})

const rows = computed(() => props.type === 'courses' ? courseRows.value : webinarRows.value)
const sectionLabel = computed(() => props.type === 'courses'
  ? t('landing.course.section.details')
  : t('landing.webinar.section.details')
)
</script>

<template>
  <section class="space-y-4">
    <h2 class="text-2xl font-medium tracking-tight">
      {{ sectionLabel }}
    </h2>
    <dl class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr] text-sm">
      <template
        v-for="(row, index) in rows"
        :key="index"
      >
        <dt class="text-muted">
          {{ row.label }}
        </dt>
        <dd>
          <span v-if="row.text">{{ row.text }}</span>
          <span
            v-else-if="row.links"
            class="flex flex-wrap gap-x-2 gap-y-1"
          >
            <NuxtLink
              v-for="(link, linkIndex) in row.links"
              :key="link.to"
              :to="link.to"
              class="text-primary hover:underline"
            >{{ link.label }}<span
              v-if="linkIndex < row.links.length - 1"
              class="text-muted"
            >,</span></NuxtLink>
          </span>
        </dd>
      </template>
    </dl>
  </section>
</template>
