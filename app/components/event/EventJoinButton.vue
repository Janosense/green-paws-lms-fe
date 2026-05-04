<script setup lang="ts">
/**
 * Phase 7.6: extracted from `WebinarJoinButton`. Takes a backend-relative
 * `redirectPath` (e.g. `/vl/v1/webinars/{slug}/join` or
 * `/vl/v1/learn/sessions/{slug}/join`) and performs a top-level navigation
 * with `?token=` appended. The backend's `QueryTokenAllowlist`
 * (vl-jwt-auth, Phase 7.5) authenticates these GETs without an
 * Authorization header — bare browser navigation cannot attach one.
 */

interface Props {
  redirectPath: string
  labelKey?: string
  variant?: 'solid' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  block?: boolean
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'webinar.join_button',
  variant: 'solid',
  size: 'lg',
  block: false,
  icon: 'i-lucide-video'
})

const { t } = useI18n()
const config = useRuntimeConfig()
const authStore = useAuthStore()

const redirecting = ref(false)

function handleClick(): void {
  if (redirecting.value) return
  const token = authStore.accessToken?.value
  if (!token) return
  redirecting.value = true
  const url = `${config.public.wpApiBase}${props.redirectPath}?token=${encodeURIComponent(token)}`
  window.location.assign(url)
}
</script>

<template>
  <UButton
    color="primary"
    :variant="variant"
    :size="size"
    :block="block"
    :loading="redirecting"
    :icon="icon"
    @click="handleClick"
  >
    {{ t(labelKey) }}
  </UButton>
</template>
