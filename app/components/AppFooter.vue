<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <footer class="border-t border-default mt-auto">
    <UContainer class="h-12 flex items-center">
      <p class="text-xs text-muted">
        {{ t('footer.copyright') }}
      </p>
    </UContainer>
  </footer>
</template>
