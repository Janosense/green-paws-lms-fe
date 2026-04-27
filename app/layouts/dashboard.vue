<!-- TODO Phase 4: real dashboard layout (sidebar, account-section nav). -->
<template>
  <div class="min-h-screen bg-default flex flex-col">
    <AppHeader />

    <main class="flex-1">
      <slot />
    </main>

    <AppFooter />
  </div>
</template>
