<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const authStore = useAuthStore()
const { t } = useI18n()
const toast = useToast()

const userLabel = computed(() => authStore.user?.display_name || authStore.user?.email || '')

async function signOut() {
  await authStore.logout()
  toast.add({
    title: t('auth.logout.toast_success'),
    color: 'success',
    icon: 'i-lucide-check'
  })
  await navigateTo('/login')
}

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t('auth.account.menu_link'),
      icon: 'i-lucide-user',
      to: '/account'
    },
    {
      label: t('auth.sessions.menu_link'),
      icon: 'i-lucide-monitor',
      to: '/account/sessions'
    }
  ],
  [
    {
      label: t('auth.logout.submit'),
      icon: 'i-lucide-log-out',
      color: 'error',
      onSelect: () => { void signOut() }
    }
  ]
])
</script>

<template>
  <div class="min-h-screen bg-default flex flex-col">
    <header class="border-b border-default">
      <UContainer class="h-14 flex items-center justify-between gap-4">
        <AppWordmark size="text-lg" />

        <div class="flex items-center gap-2">
          <AppColorModeToggle />

          <ClientOnly>
            <template v-if="!authStore.isHydrated">
              <!-- Placeholder of approximately the same width to avoid layout shift on hard refresh. -->
              <div class="h-9 w-32" />
            </template>

            <template v-else-if="authStore.isAuthenticated">
              <UDropdownMenu :items="menuItems">
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  trailing-icon="i-lucide-chevron-down"
                >
                  {{ userLabel }}
                </UButton>
              </UDropdownMenu>
            </template>

            <template v-else>
              <ULink
                to="/login"
                class="text-sm text-muted hover:text-default"
              >
                {{ t('auth.login.submit') }}
              </ULink>
              <UButton
                to="/register"
                color="primary"
                size="sm"
              >
                {{ t('auth.register.submit') }}
              </UButton>
            </template>

            <template #fallback>
              <div class="h-9 w-32" />
            </template>
          </ClientOnly>
        </div>
      </UContainer>
    </header>

    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
