<script setup lang="ts">
import type { CertificateListItem } from '#shared/types/certificate'
import { formatInSourceOffset } from '~/utils/formatInSourceOffset'

/**
 * Phase 6.4 — dashboard list card. Mirrors the visual rhythm of
 * `EnrolledCourseCard` so the certificates surface feels cohesive with
 * the existing dashboard, but uses a brand-tinted gradient cover (no
 * per-cert imagery in v1).
 *
 * @author Tymofii Synianskyi
 */
interface Props {
  item: CertificateListItem
}

const { item } = defineProps<Props>()
const { t, locale } = useI18n()

const detailPath = computed(() => `/dashboard/certificates/${item.uuid}`)

const isRevoked = computed(() => item.status === 'revoked')

const issuedAtLabel = computed(() =>
  formatInSourceOffset(item.issued_at, locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) ?? ''
)
</script>

<template>
  <UCard>
    <div class="space-y-4">
      <div class="aspect-[16/9] rounded-md bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center">
        <UIcon
          name="i-lucide-award"
          class="size-16 text-white/90"
        />
      </div>

      <UBadge
        :color="isRevoked ? 'error' : 'success'"
        variant="subtle"
        size="sm"
      >
        {{ isRevoked
          ? t('certificate.list.statusRevoked')
          : t('certificate.list.statusActive') }}
      </UBadge>

      <h3 class="text-base font-medium leading-snug line-clamp-2">
        <NuxtLink
          :to="detailPath"
          class="hover:text-primary focus-visible:outline-none focus-visible:text-primary"
        >
          {{ item.course_title }}
        </NuxtLink>
      </h3>

      <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>{{ issuedAtLabel }}</span>
        <UBadge
          v-if="item.final_score_pct !== null"
          variant="subtle"
          color="primary"
          size="sm"
        >
          {{ item.final_score_pct }}%
        </UBadge>
      </div>

      <UButton
        :to="detailPath"
        color="primary"
        block
      >
        {{ t('certificate.list.viewButton') }}
      </UButton>
    </div>
  </UCard>
</template>
