<!-- TODO Phase 5: real lesson player layout (minimal chrome, lesson rail). -->
<template>
  <div class="min-h-screen bg-default flex flex-col">
    <AppHeader />

    <main class="flex-1">
      <slot />
    </main>

    <AppFooter />
  </div>
</template>
