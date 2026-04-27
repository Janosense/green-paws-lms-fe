<script setup lang="ts">
// Centered single-column layout used by all unauthenticated auth pages.
// Quiet chrome: the wordmark sets the brand context, the color-mode toggle
// is the only interactive element outside the page slot.
</script>

<template>
  <div class="min-h-screen bg-default flex flex-col">
    <header class="flex items-center justify-end px-6 py-4">
      <AppColorModeToggle />
    </header>

    <main class="flex-1 flex items-center justify-center px-6 pb-16">
      <div class="w-full max-w-[400px] space-y-8">
        <div class="text-center">
          <AppWordmark
            size="text-2xl"
            :link="false"
          />
        </div>
        <slot />
      </div>
    </main>
  </div>
</template>
