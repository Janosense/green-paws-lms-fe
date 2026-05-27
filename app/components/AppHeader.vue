<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const authStore = useAuthStore()
const { t } = useI18n()
const toast = useToast()

const userInitials = computed(() => {
  const name = authStore.user?.display_name?.trim() || authStore.user?.email || ''
  if (!name) {
    return ''
  }
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] ?? '').concat(parts[1][0] ?? '').toUpperCase()
  }
  return (parts[0]?.slice(0, 2) ?? '').toUpperCase()
})

async function signOut() {
  await authStore.logout()
  toast.add({
    title: t('auth.logout.toast_success'),
    color: 'success',
    icon: 'i-lucide-check'
  })
  await navigateTo('/')
}

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t('nav.account'),
      icon: 'i-lucide-user',
      to: '/account'
    },
    {
      label: t('nav.sessions'),
      icon: 'i-lucide-monitor',
      to: '/account/sessions'
    }
  ],
  [
    {
      label: t('nav.logout'),
      icon: 'i-lucide-log-out',
      color: 'error',
      onSelect: () => { void signOut() }
    }
  ]
])
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-default bg-default/95 backdrop-blur">
    <UContainer class="h-19 flex items-center justify-between gap-4">
      <div class="flex items-center gap-6">
        <AppWordmark size="h-[56px]" />
        <nav class="hidden md:flex items-center gap-1">
          <UButton
            to="/courses"
            variant="ghost"
            color="neutral"
            active-color="primary"
            active-variant="soft"
            size="sm"
            class="text-[14px]"
          >
            {{ t('nav.courses') }}
          </UButton>
          <UButton
            to="/webinars"
            variant="ghost"
            color="neutral"
            active-color="primary"
            active-variant="soft"
            size="sm"
            class="text-[14px]"
          >
            {{ t('nav.webinars') }}
          </UButton>
        </nav>
      </div>

      <div class="flex items-center gap-2">
        <!-- TODO: replace with inline autocomplete (planned post-Phase 3) -->
        <UButton
          to="/search"
          icon="i-lucide-search"
          variant="ghost"
          color="neutral"
          size="sm"
          :aria-label="t('nav.search')"
        />

        <AppColorModeToggle />

        <ClientOnly>
          <template v-if="!authStore.isHydrated">
            <div class="h-9 w-24" />
          </template>

          <template v-else-if="authStore.isAuthenticated">
            <UDropdownMenu :items="menuItems">
              <UButton
                variant="ghost"
                color="neutral"
                size="sm"
                trailing-icon="i-lucide-chevron-down"
              >
                {{ userInitials || t('nav.account') }}
              </UButton>
            </UDropdownMenu>
          </template>

          <template v-else>
            <UButton
              to="/login"
              color="primary"
              size="sm"
            >
              {{ t('nav.login') }}
            </UButton>
          </template>

          <template #fallback>
            <div class="h-9 w-24" />
          </template>
        </ClientOnly>
      </div>
    </UContainer>
  </header>
</template>
