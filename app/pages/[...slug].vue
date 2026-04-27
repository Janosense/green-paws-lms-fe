<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({ title: () => t('pages.not_found.title') })

if (import.meta.server) {
  setResponseStatus(404)
}
</script>

<template>
  <NotFound />
</template>
