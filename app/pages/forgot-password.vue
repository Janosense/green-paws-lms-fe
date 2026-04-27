<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { requestPasswordResetSchema, type RequestPasswordResetFormValues } from '~/schemas/auth'
import { isApiError, resolveAuthError } from '~/utils/resolveAuthError'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const { t } = useI18n()
useHead({ title: () => t('auth.request_password_reset.title') })

const authStore = useAuthStore()
const toast = useToast()

type ViewState = 'form' | 'sent'
const view = ref<ViewState>('form')
const isSubmitting = ref(false)

const state = reactive<RequestPasswordResetFormValues>({
  email: ''
})

async function onSubmit(event: FormSubmitEvent<RequestPasswordResetFormValues>) {
  isSubmitting.value = true
  try {
    await authStore.requestPasswordReset({ email: event.data.email })
    view.value = 'sent'
  } catch (error) {
    // The backend is enumeration-safe and answers 200 even for unknown
    // emails. Anything that throws here is a real network/5xx failure —
    // surface it as a toast rather than collapsing into the generic-success
    // state, otherwise users with a flaky network think the email is on
    // its way when it isn't.
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
          {{ t('auth.request_password_reset.title') }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('auth.request_password_reset.description') }}
        </p>
      </div>

      <UForm
        :schema="requestPasswordResetSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('auth.request_password_reset.email_label')"
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
          {{ t('auth.request_password_reset.submit') }}
        </UButton>
      </UForm>

      <div class="text-center text-sm text-muted">
        <ULink
          to="/login"
          class="text-default hover:text-primary"
        >
          {{ t('auth.request_password_reset.back_to_login') }}
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
          {{ t('auth.request_password_reset.success_title') }}
        </h1>
        <p class="text-sm text-default">
          {{ t('auth.request_password_reset.success_description') }}
        </p>
      </div>
      <UButton
        to="/login"
        color="primary"
        variant="outline"
        block
      >
        {{ t('auth.request_password_reset.back_to_login') }}
      </UButton>
    </div>
  </UCard>
</template>
