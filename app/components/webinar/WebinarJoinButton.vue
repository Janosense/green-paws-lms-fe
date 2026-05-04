<script setup lang="ts">
interface Props {
  slug: string
  /** Optional override for the button label key. Defaults to "webinar.join_button". */
  labelKey?: string
  variant?: 'solid' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'webinar.join_button',
  variant: 'solid',
  size: 'lg',
  block: false
})

const { t } = useI18n()
const config = useRuntimeConfig()
const authStore = useAuthStore()

const redirecting = ref(false)

function handleClick(): void {
  if (redirecting.value) return
  const token = authStore.accessToken?.value
  if (!token) {
    return
  }
  redirecting.value = true
  // The browser cannot attach an Authorization header to a top-level
  // navigation, so the backend accepts `?token=` as the third auth
  // fallback for redirect endpoints (see vl-jwt-auth QueryTokenAllowlist).
  const url = `${config.public.wpApiBase}/vl/v1/webinars/${encodeURIComponent(props.slug)}/join?token=${encodeURIComponent(token)}`
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
    icon="i-lucide-video"
    @click="handleClick"
  >
    {{ t(labelKey) }}
  </UButton>
</template>
