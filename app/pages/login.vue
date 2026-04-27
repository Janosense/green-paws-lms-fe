<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { loginSchema, type LoginFormValues } from '~/schemas/auth'
import { isApiError, resolveAuthError } from '~/utils/resolveAuthError'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const { t } = useI18n()
useHead({ title: () => t('auth.login.title') })

const authStore = useAuthStore()
const route = useRoute()
const toast = useToast()

const state = reactive<LoginFormValues>({
  email: '',
  password: ''
})

const isSubmitting = ref(false)
const lastErrorCode = ref<string | null>(null)
const isUnverified = computed(() => lastErrorCode.value === 'vl_lms_email_not_verified')
const isResendingVerification = ref(false)

async function onSubmit(event: FormSubmitEvent<LoginFormValues>) {
  isSubmitting.value = true
  lastErrorCode.value = null
  try {
    await authStore.login({
      username: event.data.email,
      password: event.data.password
    })
    const target = safeRedirectTarget(route.query.return_to, '/account')
    await navigateTo(target)
  } catch (error) {
    if (isApiError(error)) {
      lastErrorCode.value = error.code
    }
    toast.add({
      title: t('common.error_title'),
      description: t(resolveAuthError(isApiError(error) ? error : null)),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isSubmitting.value = false
  }
}

async function onResendVerification() {
  if (!state.email) {
    toast.add({
      title: t('common.error_title'),
      description: t('auth.login.email_required_for_resend'),
      color: 'warning',
      icon: 'i-lucide-circle-alert'
    })
    return
  }
  isResendingVerification.value = true
  try {
    await authStore.resendVerification({ email: state.email })
    toast.add({
      title: t('auth.login.unverified_resend_success'),
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (error) {
    toast.add({
      title: t('common.error_title'),
      description: t(resolveAuthError(isApiError(error) ? error : null)),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isResendingVerification.value = false
  }
}
</script>

<template>
  <UCard>
    <div class="space-y-6">
      <h1 class="text-2xl font-medium tracking-tight">
        {{ t('auth.login.title') }}
      </h1>

      <UAlert
        v-if="isUnverified"
        color="warning"
        variant="soft"
        icon="i-lucide-mail-warning"
        :title="t('auth.login.unverified_alert_title')"
        :description="t('auth.login.unverified_alert_description')"
      >
        <template #actions>
          <UButton
            color="warning"
            variant="solid"
            size="sm"
            :loading="isResendingVerification"
            @click="onResendVerification"
          >
            {{ t('auth.login.unverified_resend_button') }}
          </UButton>
        </template>
      </UAlert>

      <UForm
        :schema="loginSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('auth.login.email_label')"
          name="email"
          required
        >
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="email"
            autofocus
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('auth.login.password_label')"
          name="password"
          required
        >
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="current-password"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          block
          :loading="isSubmitting"
        >
          {{ t('auth.login.submit') }}
        </UButton>
      </UForm>

      <div class="space-y-2 text-center text-sm text-muted">
        <div>
          <ULink
            to="/forgot-password"
            class="text-default hover:text-primary"
          >
            {{ t('auth.login.forgot_password') }}
          </ULink>
        </div>
        <div>
          {{ t('auth.login.no_account') }}
          <ULink
            to="/register"
            class="text-default hover:text-primary"
          >
            {{ t('auth.login.register_link') }}
          </ULink>
        </div>
      </div>
    </div>
  </UCard>
</template>
