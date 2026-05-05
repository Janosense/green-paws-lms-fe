<script setup lang="ts">
/**
 * Phase 9.2 — instructor preview banner.
 *
 * Visible at the top of `/learn/{lesson}` and `/learn/{lesson}/{topic}`
 * whenever `?preview=1` is present. Self-dismissable for the current
 * page visit (state is local; navigating away resets).
 */
const { isPreview } = useLessonPreview()
const dismissed = ref(false)
</script>

<template>
  <UAlert
    v-if="isPreview && !dismissed"
    color="warning"
    variant="subtle"
    icon="i-heroicons-eye"
    title="Режим перегляду — прогрес не зберігається"
    :close="true"
    class="mb-4"
    @update:open="dismissed = true"
  />
</template>
