<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { registerSchema, type RegisterFormValues } from '~/schemas/auth'
import { isApiError, resolveAuthError } from '~/utils/resolveAuthError'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const { t } = useI18n()
useHead({ title: () => t('auth.register.title') })

const authStore = useAuthStore()
const toast = useToast()

const RESEND_COOLDOWN_SECONDS = 60

type ViewState = 'form' | 'sent'
const view = ref<ViewState>('form')
const submittedEmail = ref('')
const isSubmitting = ref(false)
const isResending = ref(false)
const cooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const state = reactive<RegisterFormValues>({
  email: '',
  password: '',
  password_confirmation: '',
  first_name: '',
  last_name: ''
})

function startCooldown() {
  cooldown.value = RESEND_COOLDOWN_SECONDS
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
  }
})

async function onSubmit(event: FormSubmitEvent<RegisterFormValues>) {
  isSubmitting.value = true
  try {
    await authStore.register({
      email: event.data.email,
      password: event.data.password,
      first_name: event.data.first_name,
      last_name: event.data.last_name
    })
    submittedEmail.value = event.data.email
    view.value = 'sent'
    startCooldown()
  } catch (error) {
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

async function onResend() {
  if (cooldown.value > 0 || !submittedEmail.value) {
    return
  }
  isResending.value = true
  try {
    await authStore.resendVerification({ email: submittedEmail.value })
    toast.add({
      title: t('auth.register.resend_done'),
      color: 'success',
      icon: 'i-lucide-check'
    })
    startCooldown()
  } catch (error) {
    toast.add({
      title: t('common.error_title'),
      description: t(resolveAuthError(isApiError(error) ? error : null)),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isResending.value = false
  }
}
</script>

<template>
  <UCard>
    <div
      v-if="view === 'form'"
      class="space-y-6"
    >
      <h1 class="text-2xl font-medium tracking-tight">
        {{ t('auth.register.title') }}
      </h1>

      <UForm
        :schema="registerSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('auth.register.first_name_label')"
          name="first_name"
          required
        >
          <UInput
            v-model="state.first_name"
            autocomplete="given-name"
            autofocus
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('auth.register.last_name_label')"
          name="last_name"
          required
        >
          <UInput
            v-model="state.last_name"
            autocomplete="family-name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('auth.register.email_label')"
          name="email"
          required
        >
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="email"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('auth.register.password_label')"
          name="password"
          required
        >
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('auth.register.password_confirmation_label')"
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
          {{ t('auth.register.submit') }}
        </UButton>
      </UForm>

      <div class="text-center text-sm text-muted">
        {{ t('auth.register.have_account') }}
        <ULink
          to="/login"
          class="text-default hover:text-primary"
        >
          {{ t('auth.register.login_link') }}
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
          {{ t('auth.register.sent_title') }}
        </h1>
        <p class="text-sm text-default">
          {{ t('auth.register.sent_description', { email: submittedEmail }) }}
        </p>
        <p class="text-sm text-muted">
          {{ t('auth.register.sent_check_spam') }}
        </p>
      </div>
      <UButton
        color="neutral"
        variant="outline"
        block
        :loading="isResending"
        :disabled="cooldown > 0"
        @click="onResend"
      >
        <template v-if="cooldown > 0">
          {{ t('auth.register.resend_cooldown', { seconds: cooldown }) }}
        </template>
        <template v-else>
          {{ t('auth.register.resend_button') }}
        </template>
      </UButton>
      <div class="text-center text-sm text-muted">
        <ULink
          to="/login"
          class="text-default hover:text-primary"
        >
          {{ t('auth.register.login_link') }}
        </ULink>
      </div>
    </div>
  </UCard>
</template>
