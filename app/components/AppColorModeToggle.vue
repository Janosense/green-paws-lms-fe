<script setup lang="ts">
const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (next) => {
    colorMode.preference = next ? 'dark' : 'light'
  }
})

function toggle() {
  isDark.value = !isDark.value
}
</script>

<template>
  <ClientOnly>
    <UButton
      :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
      color="neutral"
      variant="ghost"
      size="sm"
      :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      @click="toggle"
    />
    <template #fallback>
      <div class="size-8" />
    </template>
  </ClientOnly>
</template>
