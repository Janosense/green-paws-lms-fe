<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { t, te } = useI18n()
useHead({ title: () => t('auth.account.title') })

const authStore = useAuthStore()
const toast = useToast()
const isSigningOut = ref(false)

const accountKindLabel = computed(() => {
  // Prefer `account_kind` from the verify-email response when available;
  // otherwise fall back to the first WP role. /me does not surface
  // account_kind today (see `shared/types/auth.ts` note).
  const kind = authStore.user?.account_kind
  if (kind && te(`auth.account_kind.${kind}`)) {
    return t(`auth.account_kind.${kind}`)
  }
  const firstRole = authStore.user?.roles?.[0]
  if (firstRole && te(`auth.account_kind.${firstRole}`)) {
    return t(`auth.account_kind.${firstRole}`)
  }
  return t('auth.account_kind.unknown')
})

const roleLabels = computed(() =>
  (authStore.user?.roles ?? []).map(role => (te(`auth.roles.${role}`) ? t(`auth.roles.${role}`) : role))
)

async function onSignOut() {
  isSigningOut.value = true
  try {
    await authStore.logout()
    toast.add({
      title: t('auth.logout.toast_success'),
      color: 'success',
      icon: 'i-lucide-check'
    })
    await navigateTo('/login')
  } finally {
    isSigningOut.value = false
  }
}
</script>

<template>
  <UContainer class="py-10">
    <div class="max-w-2xl space-y-6">
      <h1 class="text-3xl font-medium tracking-tight">
        {{ t('auth.account.title') }}
      </h1>

      <UCard v-if="authStore.user">
        <dl class="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-4 text-sm">
          <dt class="text-muted">
            {{ t('auth.account.display_name_label') }}
          </dt>
          <dd>{{ authStore.user.display_name }}</dd>

          <dt class="text-muted">
            {{ t('auth.account.email_label') }}
          </dt>
          <dd>{{ authStore.user.email }}</dd>

          <dt class="text-muted">
            {{ t('auth.account.kind_label') }}
          </dt>
          <dd>{{ accountKindLabel }}</dd>

          <dt class="text-muted">
            {{ t('auth.account.roles_label') }}
          </dt>
          <dd class="flex flex-wrap gap-2">
            <UBadge
              v-for="(label, index) in roleLabels"
              :key="index"
              color="neutral"
              variant="subtle"
            >
              {{ label }}
            </UBadge>
          </dd>
        </dl>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-base font-medium">
            {{ t('auth.account.actions_card_title') }}
          </h2>
        </template>
        <div class="flex flex-wrap items-center gap-3">
          <UButton
            to="/account/sessions"
            color="neutral"
            variant="outline"
            icon="i-lucide-monitor"
          >
            {{ t('auth.account.manage_sessions') }}
          </UButton>
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-log-out"
            :loading="isSigningOut"
            @click="onSignOut"
          >
            {{ t('auth.logout.submit') }}
          </UButton>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
