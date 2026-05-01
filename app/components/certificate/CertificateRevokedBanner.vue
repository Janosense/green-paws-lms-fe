<script setup lang="ts">
/**
 * Phase 6.4 — revoked-state banner. Two variants:
 *
 * - `inline` (default): a `<UAlert>`-style strip used at the top of the
 *   authed detail page above the metadata block.
 * - `hero`: full-card replacement used on the public verification page
 *   when the certificate is revoked — replaces the success header.
 *
 * @author Tymofii Synianskyi
 */
interface Props {
  revokedAt: string
  variant?: 'inline' | 'hero'
}

const { revokedAt, variant = 'inline' } = defineProps<Props>()

const { t, locale } = useI18n()

const revokedAtLabel = computed(() => {
  const date = new Date(revokedAt)
  if (Number.isNaN(date.getTime())) return revokedAt
  try {
    return new Intl.DateTimeFormat(locale.value, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  } catch {
    return revokedAt
  }
})

const description = computed(() =>
  t('certificate.revoked.body', { date: revokedAtLabel.value })
)
</script>

<template>
  <UAlert
    v-if="variant === 'inline'"
    color="error"
    variant="subtle"
    icon="i-lucide-shield-x"
    :title="t('certificate.revoked.title')"
    :description="description"
  />

  <div
    v-else
    class="flex flex-col items-center text-center gap-4"
  >
    <UIcon
      name="i-lucide-shield-x"
      class="size-16 text-error"
    />
    <h1 class="text-2xl md:text-3xl font-medium tracking-tight">
      {{ t('certificate.revoked.title') }}
    </h1>
    <p class="text-sm text-muted">
      {{ description }}
    </p>
  </div>
</template>
