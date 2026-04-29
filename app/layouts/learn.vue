<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const progressStore = useProgressStore()

const courseSlug = computed(() => progressStore.currentCourse?.course.slug ?? null)
const courseTitle = computed(() => progressStore.currentCourse?.course.title ?? null)
const courseHref = computed(() => (courseSlug.value ? `/courses/${courseSlug.value}` : null))

const railOpen = ref(false)

watch(() => route.fullPath, () => {
  railOpen.value = false
})
</script>

<template>
  <div class="min-h-screen bg-elevated flex flex-col">
    <header class="sticky top-0 z-30 h-12 md:h-14 bg-default border-b border-default">
      <div class="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2 min-w-0">
          <UButton
            icon="i-lucide-list-tree"
            color="neutral"
            variant="ghost"
            class="md:hidden"
            :aria-label="t('learn.layout.open_curriculum')"
            @click="railOpen = true"
          />
          <NuxtLink
            v-if="courseHref && courseTitle"
            :to="courseHref"
            class="inline-flex items-center gap-2 text-sm text-default hover:text-primary truncate"
          >
            <UIcon
              name="i-lucide-arrow-left"
              class="size-4 shrink-0"
            />
            <span class="truncate">{{ courseTitle }}</span>
          </NuxtLink>
          <span
            v-else
            class="inline-flex items-center gap-2 text-sm text-muted"
            :aria-label="t('learn.layout.back_to_course_loading')"
          >
            <UIcon
              name="i-lucide-arrow-left"
              class="size-4 shrink-0"
            />
            <USkeleton class="h-4 w-32" />
          </span>
        </div>

        <div class="flex items-center gap-3">
          <NuxtLink
            to="/dashboard"
            class="text-sm text-muted hover:text-default"
          >
            {{ t('learn.layout.dashboard_link') }}
          </NuxtLink>
          <AppColorModeToggle />
        </div>
      </div>
    </header>

    <div class="flex-1 flex">
      <aside
        class="hidden md:block sticky top-14 w-[280px] shrink-0 self-start h-[calc(100vh-3.5rem)] bg-default border-e border-default"
      >
        <LearnCurriculumRail />
      </aside>

      <main class="flex-1 min-w-0 bg-default">
        <div class="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <slot />
        </div>
      </main>
    </div>

    <USlideover
      v-model:open="railOpen"
      side="left"
      :title="t('learn.layout.open_curriculum')"
      :ui="{ content: 'w-[80vw] max-w-[320px] bg-default' }"
    >
      <template #body>
        <LearnCurriculumRail />
      </template>
    </USlideover>
  </div>
</template>
