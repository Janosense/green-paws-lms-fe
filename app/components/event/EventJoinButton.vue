<script setup lang="ts">
/**
 * Phase 7.6: extracted from `WebinarJoinButton`. Takes a backend-relative
 * `redirectPath` (e.g. `/vl/v1/webinars/{slug}/join` or
 * `/vl/v1/learn/sessions/{slug}/join`) and performs a top-level navigation
 * with `?token=` appended. The backend's `QueryTokenAllowlist`
 * (vl-jwt-auth, Phase 7.5) authenticates these GETs without an
 * Authorization header — bare browser navigation cannot attach one.
 *
 * Top-level navigation can't observe the response, so the regular 401
 * refresh-and-retry interceptor in `useApi` is useless here — once we
 * call `window.location.assign`, the browser owns the page. If the
 * access token is expired we'd land on the backend's raw 401 JSON
 * page. So we preemptively refresh whenever the token has less than
 * `STALE_THRESHOLD_SECONDS` of life.
 */

interface Props {
  redirectPath: string
  labelKey?: string
  variant?: 'solid' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  block?: boolean
  icon?: string
}

const STALE_THRESHOLD_SECONDS = 30

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'webinar.join_button',
  variant: 'solid',
  size: 'lg',
  block: false,
  icon: 'i-lucide-video'
})

const { t } = useI18n()
const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()

const redirecting = ref(false)

async function handleClick(): Promise<void> {
  if (redirecting.value) return
  redirecting.value = true
  try {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const expiresAt = authStore.accessToken?.expires_at ?? 0
    if (expiresAt <= nowSeconds + STALE_THRESHOLD_SECONDS) {
      try {
        await authStore.refresh()
      } catch {
        await navigateTo({ path: '/login', query: { return_to: route.fullPath } })
        return
      }
    }
    const token = authStore.accessToken?.value
    if (!token) {
      await navigateTo({ path: '/login', query: { return_to: route.fullPath } })
      return
    }
    const url = `${config.public.wpApiBase}${props.redirectPath}?token=${encodeURIComponent(token)}`
    window.location.assign(url)
  } finally {
    redirecting.value = false
  }
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
