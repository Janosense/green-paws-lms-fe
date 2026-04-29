<script setup lang="ts">
import type { EnrollmentRecord } from '#shared/types/enrollments'
import { continueUrl } from '~/composables/useLearnNavigation'

interface Props {
  enrollment: EnrollmentRecord
}

const { enrollment } = defineProps<Props>()
const { t } = useI18n()
const router = useRouter()
const progressStore = useProgressStore()

const coursePath = computed(() => `/courses/${enrollment.course.slug}`)

const titleInitial = computed(() => enrollment.course.title.trim().charAt(0).toUpperCase())

const isCompleted = computed(() => enrollment.status === 'completed')

const ctaLabel = computed(() =>
  isCompleted.value
    ? t('enrollment.actions.review')
    : t('enrollment.actions.continue')
)

const ctaLoading = ref(false)

async function onContinueClick(): Promise<void> {
  if (ctaLoading.value) return
  ctaLoading.value = true
  try {
    await progressStore.ensureCourseLoaded(enrollment.course.slug)
    const curriculum = progressStore.curricula[enrollment.course.slug]
    if (!curriculum) {
      await router.push(coursePath.value)
      return
    }
    const url = continueUrl(curriculum)
    await router.push(url ?? coursePath.value)
  } finally {
    ctaLoading.value = false
  }
}
</script>

<template>
  <UCard>
    <div class="space-y-4">
      <CatalogCardCover
        :cover="enrollment.course.cover"
        fallback-icon="i-lucide-book-open"
        :fallback-initial="titleInitial"
      />

      <UBadge
        :color="isCompleted ? 'success' : 'primary'"
        variant="subtle"
        size="sm"
      >
        {{ isCompleted
          ? t('enrollment.status.completed')
          : t('enrollment.status.active') }}
      </UBadge>

      <h3 class="text-base font-medium leading-snug line-clamp-2">
        <NuxtLink
          :to="coursePath"
          class="hover:text-primary focus-visible:outline-none focus-visible:text-primary"
        >
          {{ enrollment.course.title }}
        </NuxtLink>
      </h3>

      <UProgress
        v-if="!isCompleted"
        :model-value="enrollment.progress_pct"
        :max="100"
        size="sm"
        color="primary"
      >
        <template #default>
          <span class="text-xs text-muted">{{ enrollment.progress_pct }}%</span>
        </template>
      </UProgress>

      <UButton
        color="primary"
        block
        :loading="ctaLoading"
        @click="onContinueClick"
      >
        {{ ctaLabel }}
      </UButton>
    </div>
  </UCard>
</template>
