<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { buildConfirmPasswordResetSchema, type ConfirmPasswordResetFormValues } from '~/schemas/auth'
import { isApiError, resolveAuthError } from '~/utils/resolveAuthError'

definePageMeta({
  layout: 'auth'
})

const { t } = useI18n()
useHead({ title: () => t('auth.reset_password.title') })

const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()

type ViewState = 'form' | 'success' | 'error'
const view = ref<ViewState>('form')
const errorCode = ref<string | null>(null)
const isSubmitting = ref(false)

const tokenFromQuery = typeof route.query.token === 'string' ? route.query.token.trim() : ''
if (!tokenFromQuery) {
  view.value = 'error'
  errorCode.value = 'vl_lms_password_reset_invalid_token'
}

const state = reactive<ConfirmPasswordResetFormValues>({
  token: tokenFromQuery,
  password: '',
  password_confirmation: ''
})

const schema = computed(() => buildConfirmPasswordResetSchema(t))

const errorTitleKey = computed(() => {
  if (errorCode.value === 'vl_lms_password_reset_token_expired') {
    return 'auth.reset_password.error_expired_title'
  }
  return 'auth.reset_password.error_invalid_title'
})

const errorDescriptionKey = computed(() => {
  if (errorCode.value === 'vl_lms_password_reset_token_expired') {
    return 'auth.reset_password.error_expired_description'
  }
  return 'auth.reset_password.error_invalid_description'
})

async function onSubmit(event: FormSubmitEvent<ConfirmPasswordResetFormValues>) {
  isSubmitting.value = true
  try {
    await authStore.confirmPasswordReset({
      token: event.data.token,
      password: event.data.password
    })
    view.value = 'success'
  } catch (error) {
    if (isApiError(error)) {
      // Weak password keeps the form open — token is still valid, the
      // user can retry. Token errors switch to the error view.
      if (error.code === 'vl_lms_password_reset_weak_password') {
        toast.add({
          title: t('common.error_title'),
          description: t(resolveAuthError(error)),
          color: 'error',
          icon: 'i-lucide-circle-alert'
        })
      } else {
        errorCode.value = error.code
        view.value = 'error'
      }
    } else {
      toast.add({
        title: t('common.error_title'),
        description: t('errors.unknown_error'),
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UCard>
    <div
      v-if="view === 'form'"
      class="space-y-6"
    >
      <div class="space-y-2">
        <h1 class="text-2xl font-medium tracking-tight">
          {{ t('auth.reset_password.title') }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('auth.reset_password.description') }}
        </p>
      </div>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('auth.reset_password.password_label')"
          name="password"
          required
        >
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="new-password"
            autofocus
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('auth.reset_password.password_confirmation_label')"
          name="password_confirmation"
          required
        >
          <UInput
            v-model="state.password_confirmation"
            type="password"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          block
          :loading="isSubmitting"
        >
          {{ t('auth.reset_password.submit') }}
        </UButton>
      </UForm>
    </div>

    <div
      v-else-if="view === 'success'"
      class="space-y-6"
    >
      <div class="flex justify-center">
        <UIcon
          name="i-lucide-check-circle-2"
          class="size-12 text-primary"
        />
      </div>
      <div class="space-y-3 text-center">
        <h1 class="text-2xl font-medium tracking-tight">
          {{ t('auth.reset_password.success_title') }}
        </h1>
        <p class="text-sm text-default">
          {{ t('auth.reset_password.success_description') }}
        </p>
      </div>
      <UButton
        to="/login"
        color="primary"
        block
      >
        {{ t('auth.reset_password.go_to_login') }}
      </UButton>
    </div>

    <div
      v-else
      class="space-y-6"
    >
      <div class="flex justify-center">
        <UIcon
          name="i-lucide-circle-alert"
          class="size-12 text-error"
        />
      </div>
      <div class="space-y-3 text-center">
        <h1 class="text-2xl font-medium tracking-tight">
          {{ t(errorTitleKey) }}
        </h1>
        <p class="text-sm text-default">
          {{ t(errorDescriptionKey) }}
        </p>
      </div>
      <UButton
        to="/forgot-password"
        color="primary"
        block
      >
        {{ t('auth.reset_password.request_new_link') }}
      </UButton>
      <ULink
        to="/login"
        class="block text-center text-sm text-muted hover:text-primary"
      >
        {{ t('auth.request_password_reset.back_to_login') }}
      </ULink>
    </div>
  </UCard>
</template>
