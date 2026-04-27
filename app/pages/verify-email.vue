<script setup lang="ts">
import type { ApiError } from '#shared/types/api'
import { isApiError, resolveAuthError } from '~/utils/resolveAuthError'

definePageMeta({
  layout: 'auth'
})

const { t } = useI18n()
useHead({ title: () => t('auth.verify_email.title') })

const route = useRoute()
const authStore = useAuthStore()

type ViewState = 'verifying' | 'success' | 'error'
// Read the token synchronously so SSR can render the missing-token error
// view directly, instead of flashing the spinner and switching after hydrate.
const initialToken = typeof route.query.token === 'string' ? route.query.token.trim() : ''
const view = ref<ViewState>(initialToken ? 'verifying' : 'error')
const errorKey = ref<string>('errors.unknown_error')
const errorMissingToken = ref(!initialToken)

let redirectTimer: ReturnType<typeof setTimeout> | null = null

onUnmounted(() => {
  if (redirectTimer) {
    clearTimeout(redirectTimer)
  }
})

onMounted(async () => {
  if (!initialToken) {
    return
  }

  try {
    await authStore.verifyEmail({ token: initialToken })
    view.value = 'success'

    // Auto-redirect to /account after 2s, except when the user has
    // requested reduced motion — in that case rely on the manual link.
    const prefersReducedMotion
      = import.meta.client
        && typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!prefersReducedMotion) {
      redirectTimer = setTimeout(() => {
        void navigateTo('/account')
      }, 2000)
    }
  } catch (error) {
    errorKey.value = resolveAuthError(isApiError(error) ? (error as ApiError) : null)
    view.value = 'error'
  }
})
</script>

<template>
  <UCard>
    <div class="space-y-6">
      <div
        v-if="view === 'verifying'"
        class="space-y-4 text-center"
      >
        <div class="flex justify-center">
          <UIcon
            name="i-lucide-loader-circle"
            class="size-10 text-muted animate-spin"
          />
        </div>
        <h1 class="text-2xl font-medium tracking-tight">
          {{ t('auth.verify_email.in_progress_title') }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('auth.verify_email.in_progress_description') }}
        </p>
      </div>

      <div
        v-else-if="view === 'success'"
        class="space-y-4 text-center"
      >
        <div class="flex justify-center">
          <UIcon
            name="i-lucide-check-circle-2"
            class="size-12 text-primary"
          />
        </div>
        <h1 class="text-2xl font-medium tracking-tight">
          {{ t('auth.verify_email.success_title') }}
        </h1>
        <p class="text-sm text-default">
          {{ t('auth.verify_email.success_description') }}
        </p>
        <p class="text-sm text-muted">
          {{ t('auth.verify_email.auto_redirect_note') }}
        </p>
        <UButton
          to="/account"
          color="primary"
          block
        >
          {{ t('auth.verify_email.continue_link') }}
        </UButton>
      </div>

      <div
        v-else
        class="space-y-4 text-center"
      >
        <div class="flex justify-center">
          <UIcon
            name="i-lucide-circle-alert"
            class="size-12 text-error"
          />
        </div>
        <h1 class="text-2xl font-medium tracking-tight">
          {{ t('auth.verify_email.error_title') }}
        </h1>
        <p class="text-sm text-default">
          <template v-if="errorMissingToken">
            {{ t('auth.verify_email.missing_token_description') }}
          </template>
          <template v-else>
            {{ t(errorKey) }}
          </template>
        </p>
        <UButton
          to="/resend-verification"
          color="primary"
          block
        >
          {{ t('auth.verify_email.resend_button') }}
        </UButton>
        <ULink
          to="/login"
          class="block text-sm text-muted hover:text-primary"
        >
          {{ t('auth.request_password_reset.back_to_login') }}
        </ULink>
      </div>
    </div>
  </UCard>
</template>
