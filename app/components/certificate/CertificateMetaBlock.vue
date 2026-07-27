<script setup lang="ts">
/**
 * Phase 6.4 — presentational `<dl>` block shared by the dashboard detail
 * page and the public verification page. Keeps the certificate data
 * presentation consistent across surfaces.
 *
 * `learnerName` is optional — the dashboard surface gets the full legal
 * name (`detail.learner_full_name`); the public surface gets the
 * privacy-minimal display name ("Богдан К.").
 *
 * @author Tymofii Synianskyi
 */
import { formatInSourceOffset } from '~/utils/formatInSourceOffset'

interface Props {
  courseTitle: string
  issuerName: string
  issuedAt: string
  instructorNames: string[]
  finalScorePct: number | null
  learnerName?: string
}

const props = defineProps<Props>()

const { t, locale } = useI18n()

const issuedAtLabel = computed(() =>
  formatInSourceOffset(props.issuedAt, locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) ?? props.issuedAt
)

const instructorLabel = computed(() =>
  props.instructorNames.length > 1
    ? t('certificate.detail.fields.instructorPlural')
    : t('certificate.detail.fields.instructorSingular')
)

const instructorJoined = computed(() => props.instructorNames.join(', '))
</script>

<template>
  <dl class="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
    <template v-if="learnerName">
      <dt class="text-muted">
        {{ t('certificate.detail.fields.learner') }}
      </dt>
      <dd class="text-default font-medium">
        {{ learnerName }}
      </dd>
    </template>

    <dt class="text-muted">
      {{ t('certificate.detail.fields.course') }}
    </dt>
    <dd class="text-default font-medium">
      {{ courseTitle }}
    </dd>

    <template v-if="instructorNames.length > 0">
      <dt class="text-muted">
        {{ instructorLabel }}
      </dt>
      <dd class="text-default">
        {{ instructorJoined }}
      </dd>
    </template>

    <dt class="text-muted">
      {{ t('certificate.detail.fields.issuedBy') }}
    </dt>
    <dd class="text-default">
      {{ issuerName }}
    </dd>

    <dt class="text-muted">
      {{ t('certificate.detail.fields.issuedAt') }}
    </dt>
    <dd class="text-default">
      {{ issuedAtLabel }}
    </dd>

    <template v-if="finalScorePct !== null">
      <dt class="text-muted">
        {{ t('certificate.detail.fields.score') }}
      </dt>
      <dd class="text-default font-medium">
        {{ finalScorePct }}%
      </dd>
    </template>
  </dl>
</template>
