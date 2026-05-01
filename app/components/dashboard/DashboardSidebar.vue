<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

type SidebarItemKey = 'my_learning' | 'certificates' | 'account' | 'sessions'

interface SidebarItem {
  key: SidebarItemKey
  to: '/dashboard' | '/dashboard/certificates' | '/account' | '/account/sessions'
  labelKey: string
  icon: string
}

const items: SidebarItem[] = [
  { key: 'my_learning', to: '/dashboard', labelKey: 'dashboard.sidebar.my_learning', icon: 'i-lucide-book-open' },
  { key: 'certificates', to: '/dashboard/certificates', labelKey: 'dashboard.sidebar.certificates', icon: 'i-lucide-award' },
  { key: 'account', to: '/account', labelKey: 'dashboard.sidebar.account', icon: 'i-lucide-user' },
  { key: 'sessions', to: '/account/sessions', labelKey: 'dashboard.sidebar.sessions', icon: 'i-lucide-monitor' }
]

const { t } = useI18n()
const route = useRoute()

const navItems = computed<NavigationMenuItem[]>(() =>
  items.map(item => ({
    label: t(item.labelKey),
    icon: item.icon,
    to: item.to,
    active: route.path === item.to
  }))
)
</script>

<template>
  <UNavigationMenu
    orientation="vertical"
    :items="navItems"
    class="w-full p-3"
  />
</template>
