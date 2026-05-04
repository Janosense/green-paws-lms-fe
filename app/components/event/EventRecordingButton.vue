<script setup lang="ts">
interface Props {
  redirectPath: string
  labelKey?: string
  variant?: 'solid' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  block?: boolean
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'webinar.watch_recording_button',
  variant: 'solid',
  size: 'lg',
  block: false,
  icon: 'i-lucide-play-circle'
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
