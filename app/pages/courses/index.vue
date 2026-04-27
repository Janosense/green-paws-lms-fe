<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { t } = useI18n()

useSeoMeta({
  title: () => `${t('catalog.courses.title')} | Green Paws LMS`,
  description: () => t('catalog.courses.meta_description')
})
</script>

<template>
  <CatalogShell type="courses" />
</template>
