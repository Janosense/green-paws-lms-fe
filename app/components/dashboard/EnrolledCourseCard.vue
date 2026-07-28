<script setup lang="ts">
import type { EnrollmentRecord } from '#shared/types/enrollments'
import { continueUrl } from '~/composables/useLearnNavigation'
import { resolveEnrollmentError } from '~/utils/resolveEnrollmentError'

interface Props {
  enrollment: EnrollmentRecord
}

const { enrollment } = defineProps<Props>()
const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const progressStore = useProgressStore()
const enrollmentsStore = useEnrollmentsStore()
const quizAttemptStore = useQuizAttemptStore()

const coursePath = computed(() => `/courses/${enrollment.course.slug}`)

const titleInitial = computed(() => enrollment.course.title.trim().charAt(0).toUpperCase())

const isCompleted = computed(() => enrollment.status === 'completed')

const ctaLabel = computed(() =>
  isCompleted.value
    ? t('enrollment.actions.review')
    : t('enrollment.actions.continue')
)

const ctaLoading = ref(false)

const resetOpen = ref(false)
const resetLoading = ref(false)

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

async function onConfirmReset(): Promise<void> {
  if (resetLoading.value) return
  resetLoading.value = true
  try {
    await enrollmentsStore.resetProgress(enrollment.course.slug)
    resetOpen.value = false
    // The cached curriculum is stale (locks re-engaged, statuses cleared);
    // drop it and let the next visit refetch. Quiz caches are keyed by quiz
    // slug with no course index, so the whole store is cleared.
    progressStore.removeCourse(enrollment.course.slug)
    quizAttemptStore.clearAll()
    toast.add({
      title: t('enrollment.toast.progress_reset'),
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (caught) {
    toast.add({
      title: t('common.error_title'),
      description: t(resolveEnrollmentError(caught)),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    resetLoading.value = false
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

      <div class="flex flex-wrap items-center gap-2 pt-1">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-rotate-ccw"
          @click="resetOpen = true"
        >
          {{ t('enrollment.actions.reset_progress') }}
        </UButton>
      </div>
    </div>

    <UModal
      v-model:open="resetOpen"
      :title="t('enrollment.reset_confirm_title')"
      :description="t('enrollment.reset_confirm_body')"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="resetLoading"
            @click="resetOpen = false"
          >
            {{ t('enrollment.reset_confirm_no') }}
          </UButton>
          <UButton
            color="error"
            :loading="resetLoading"
            @click="onConfirmReset"
          >
            {{ t('enrollment.reset_confirm_yes') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UCard>
</template>
