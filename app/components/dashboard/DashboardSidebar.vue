<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

type SidebarItemKey = 'my_learning' | 'webinars' | 'certificates' | 'orders' | 'account' | 'sessions'

interface SidebarItem {
  key: SidebarItemKey
  to: '/dashboard' | '/dashboard/webinars' | '/dashboard/certificates' | '/dashboard/orders' | '/account' | '/account/sessions'
  labelKey: string
  icon: string
}

const items: SidebarItem[] = [
  { key: 'my_learning', to: '/dashboard', labelKey: 'dashboard.sidebar.my_learning', icon: 'i-lucide-book-open' },
  { key: 'webinars', to: '/dashboard/webinars', labelKey: 'dashboard.sidebar.webinars', icon: 'i-lucide-calendar-check' },
  { key: 'certificates', to: '/dashboard/certificates', labelKey: 'dashboard.sidebar.certificates', icon: 'i-lucide-award' },
  { key: 'orders', to: '/dashboard/orders', labelKey: 'dashboard.sidebar.orders', icon: 'i-lucide-receipt' },
  { key: 'account', to: '/account', labelKey: 'dashboard.sidebar.account', icon: 'i-lucide-user' },
  { key: 'sessions', to: '/account/sessions', labelKey: 'dashboard.sidebar.sessions', icon: 'i-lucide-monitor' }
]

const { t } = useI18n()
const route = useRoute()
const webinarsStore = useWebinarRegistrationsStore()

const navItems = computed<NavigationMenuItem[]>(() =>
  items.map((item) => {
    const node: NavigationMenuItem = {
      label: t(item.labelKey),
      icon: item.icon,
      to: item.to,
      active: route.path === item.to
    }
    if (item.key === 'webinars' && webinarsStore.activeRegistrations.length > 0) {
      node.badge = String(webinarsStore.activeRegistrations.length)
    }
    return node
  })
)
</script>

<template>
  <UNavigationMenu
    orientation="vertical"
    :items="navItems"
    class="w-full p-3"
  />
</template>
