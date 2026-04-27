<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { t } = useI18n()

useSeoMeta({
  title: () => `${t('catalog.webinars.title')} | Green Paws LMS`,
  description: () => t('catalog.webinars.meta_description')
})
</script>

<template>
  <CatalogShell type="webinars" />
</template>
