<script setup lang="ts">
import type { CatalogType, DetailInstructor } from '#shared/types/catalog'

interface Props {
  type: CatalogType
  instructors: DetailInstructor[]
}

const props = defineProps<Props>()
const { t } = useI18n()

const hasAny = computed(() => props.instructors.length > 0)
</script>

<template>
  <section
    v-if="hasAny"
    class="space-y-6"
  >
    <h2 class="text-2xl font-medium tracking-tight">
      {{ t(`landing.${props.type === 'courses' ? 'course' : 'webinar'}.section.instructors`) }}
    </h2>
    <ul class="space-y-8">
      <li
        v-for="instructor in instructors"
        :key="instructor.id"
        class="flex flex-col gap-4 sm:flex-row sm:items-start"
      >
        <UAvatar
          :src="instructor.avatar.url"
          :alt="instructor.display_name"
          size="2xl"
          class="shrink-0"
        />
        <div class="space-y-2 min-w-0">
          <div class="space-y-1">
            <h3 class="text-lg font-medium">
              {{ instructor.display_name }}
            </h3>
            <p class="text-sm text-muted">
              {{ t(`landing.instructor.role.${instructor.role_in_course}`) }}
            </p>
          </div>
          <!-- eslint-disable vue/no-v-html -->
          <div
            v-if="instructor.bio"
            class="prose-content text-sm"
            v-html="instructor.bio"
          />
          <!-- eslint-enable vue/no-v-html -->
        </div>
      </li>
    </ul>
  </section>
</template>
