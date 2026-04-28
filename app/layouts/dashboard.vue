<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const isSidebarOpen = ref(false)

watch(() => route.path, () => {
  isSidebarOpen.value = false
})
</script>

<template>
  <div class="min-h-screen bg-default flex flex-col">
    <AppHeader />

    <div class="flex-1 flex">
      <aside class="hidden md:block w-60 shrink-0 bg-elevated border-r border-default">
        <DashboardSidebar />
      </aside>

      <main class="flex-1 min-w-0">
        <div class="md:hidden flex px-4 pt-4">
          <UButton
            icon="i-lucide-menu"
            color="neutral"
            variant="ghost"
            :aria-label="t('dashboard.sidebar.toggle')"
            @click="isSidebarOpen = true"
          />
        </div>

        <slot />
      </main>
    </div>

    <AppFooter />

    <USlideover
      v-model:open="isSidebarOpen"
      side="left"
      :title="t('dashboard.sidebar.toggle')"
      :ui="{ content: 'bg-elevated' }"
    >
      <template #body>
        <DashboardSidebar />
      </template>
    </USlideover>
  </div>
</template>
