<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { buildResendVerificationSchema, type ResendVerificationFormValues } from '~/schemas/auth'
import { isApiError, resolveAuthError } from '~/utils/resolveAuthError'

definePageMeta({
  layout: 'auth'
})

const { t } = useI18n()
useHead({ title: () => t('auth.resend_verification.title') })

const authStore = useAuthStore()
const toast = useToast()

type ViewState = 'form' | 'sent'
const view = ref<ViewState>('form')
const isSubmitting = ref(false)

const state = reactive<ResendVerificationFormValues>({
  email: ''
})

const schema = computed(() => buildResendVerificationSchema(t))

async function onSubmit(event: FormSubmitEvent<ResendVerificationFormValues>) {
  isSubmitting.value = true
  try {
    await authStore.resendVerification({ email: event.data.email })
    view.value = 'sent'
  } catch (error) {
    // Same enumeration-safe contract as forgot-password: backend returns
    // 200 even when the email is unknown, so a real error here means
    // network/5xx, not "not found".
    if (isApiError(error) && (error.status >= 500 || error.code === 'network_error')) {
      toast.add({
        title: t('common.error_title'),
        description: t(resolveAuthError(error)),
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
    } else {
      view.value = 'sent'
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
          {{ t('auth.resend_verification.title') }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('auth.resend_verification.description') }}
        </p>
      </div>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('auth.resend_verification.email_label')"
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

        <UButton
          type="submit"
          color="primary"
          block
          :loading="isSubmitting"
        >
          {{ t('auth.resend_verification.submit') }}
        </UButton>
      </UForm>

      <div class="text-center text-sm text-muted">
        <ULink
          to="/login"
          class="text-default hover:text-primary"
        >
          {{ t('auth.resend_verification.back_to_login') }}
        </ULink>
      </div>
    </div>

    <div
      v-else
      class="space-y-6"
    >
      <div class="flex justify-center">
        <UIcon
          name="i-lucide-mail-check"
          class="size-12 text-primary"
        />
      </div>
      <div class="space-y-3 text-center">
        <h1 class="text-2xl font-medium tracking-tight">
          {{ t('auth.resend_verification.success_title') }}
        </h1>
        <p class="text-sm text-default">
          {{ t('auth.resend_verification.success_description') }}
        </p>
      </div>
      <UButton
        to="/login"
        color="primary"
        variant="outline"
        block
      >
        {{ t('auth.resend_verification.back_to_login') }}
      </UButton>
    </div>
  </UCard>
</template>
