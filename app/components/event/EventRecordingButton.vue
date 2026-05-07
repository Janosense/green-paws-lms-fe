<script setup lang="ts">
/**
 * Mirrors `EventJoinButton`'s preflight refresh — top-level navigation
 * with `?token=` can't observe a 401 to retry, so we refresh whenever
 * the access token has less than `STALE_THRESHOLD_SECONDS` of life.
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
  labelKey: 'webinar.watch_recording_button',
  variant: 'solid',
  size: 'lg',
  block: false,
  icon: 'i-lucide-play-circle'
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
