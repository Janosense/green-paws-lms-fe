<script setup lang="ts">
import type { WebinarDetailResponse } from '#shared/types/catalog'
import { resolveWebinarError } from '~/utils/resolveWebinarError'
import { formatScheduledDate } from '~/utils/formatScheduledDate'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()

const slug = computed(() => route.params.slug as string)

const store = useWebinarRegistrationsStore()
if (!store.initialized) {
  await store.init()
}

const { data, status, error, refresh } = await useApiFetch<WebinarDetailResponse>(
  () => `/vl/v1/catalog/webinars/${slug.value}`
)

const apiCode = computed(() => {
  const raw = error.value as { code?: unknown } | null
  return raw && typeof raw.code === 'string' ? raw.code : null
})

if (apiCode.value === 'vl_lms_not_found') {
  throw createError({
    statusCode: 404,
    statusMessage: 'Resource not found',
    fatal: true
  })
}

const webinar = computed(() => {
  const envelope = data.value
  return envelope && envelope.success ? envelope.data : null
})

const registration = computed(() => store.getRegistration(slug.value))

useHead({
  title: () => webinar.value?.title ?? t('webinar.page_title'),
  meta: [{ name: 'robots', content: 'noindex,follow' }]
})

// If the user has no record at all (active or cancelled), bounce back to
// the list — this page is the registered-user view and should not surface
// catalog content for non-registrants.
watchEffect(() => {
  if (!store.initialized || !webinar.value) {
    return
  }
  if (registration.value === null) {
    toast.add({
      title: t('webinar.errors.not_registered'),
      color: 'warning',
      icon: 'i-lucide-info'
    })
    void router.replace('/dashboard/webinars')
  }
})

const dateLine = computed(() => {
  if (!webinar.value) return ''
  return formatScheduledDate(
    webinar.value.scheduled_start,
    webinar.value.status,
    { completedPrefix: t('catalog.card.completed_prefix') }
  )
})

const isJoinWindowOpen = computed(() => {
  const r = registration.value
  return !!r && r.status === 'active' && !r.computed.is_past && r.computed.join_window_open
})
const isPast = computed(() => registration.value?.computed.is_past === true)
const recordingAvailable = computed(
  () => isPast.value && registration.value?.computed.recording_available === true
)
const recordingNoneOffered = computed(
  () => isPast.value && registration.value?.webinar.recording_access_days === 0
)
const recordingExpired = computed(
  () => isPast.value && !recordingAvailable.value && !recordingNoneOffered.value
)

const cancelOpen = ref(false)
const cancelLoading = ref(false)
const reRegisterLoading = ref(false)

const sessionCancelled = computed(() => webinar.value?.status === 'cancelled')

async function onConfirmCancel(): Promise<void> {
  if (cancelLoading.value) return
  cancelLoading.value = true
  try {
    await store.cancel(slug.value)
    cancelOpen.value = false
    toast.add({
      title: t('webinar.cancel_success'),
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (caught) {
    const resolved = resolveWebinarError(caught)
    toast.add({
      title: t(resolved.key),
      color: 'error',
      icon: 'i-lucide-alert-triangle'
    })
  } finally {
    cancelLoading.value = false
  }
}

async function onReRegister(): Promise<void> {
  if (reRegisterLoading.value) return
  reRegisterLoading.value = true
  try {
    await store.register(slug.value)
    toast.add({
      title: t('webinar.re_register_success'),
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (caught) {
    const resolved = resolveWebinarError(caught)
    toast.add({
      title: t(resolved.key),
      color: 'error',
      icon: 'i-lucide-alert-triangle'
    })
  } finally {
    reRegisterLoading.value = false
  }
}

const recordingUntilLine = computed(() => {
  const until = registration.value?.webinar.recording_available_until
  if (!until) return ''
  const date = new Date(until)
  if (Number.isNaN(date.getTime())) return ''
  try {
    const formatted = new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
    return t('webinar.recording_until', { date: formatted })
  } catch {
    return ''
  }
})

const cancelledAtLine = computed(() => {
  const at = registration.value?.cancelled_at
  if (!at) return ''
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return ''
  try {
    const formatted = new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
    return t('webinar.cancelled_at_line', { date: formatted })
  } catch {
    return ''
  }
})
</script>

<template>
  <UContainer class="py-10">
    <ErrorState
      v-if="error && !webinar"
      icon="i-lucide-alert-triangle"
      :title="t('catalog.error.title')"
      :description="t('catalog.error.description')"
    >
      <UButton
        color="primary"
        icon="i-lucide-rotate-ccw"
        @click="refresh()"
      >
        {{ t('common.try_again') }}
      </UButton>
    </ErrorState>

    <LoadingSkeleton
      v-else-if="status === 'pending' && !webinar"
      variant="text"
    />

    <div
      v-else-if="webinar && registration"
      class="space-y-8"
    >
      <UButton
        to="/dashboard/webinars"
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
        size="sm"
      >
        {{ t('webinar.back_to_list') }}
      </UButton>

      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-3xl font-medium tracking-tight">
            {{ webinar.title }}
          </h1>
          <WebinarStatusBadge :status="webinar.status" />
        </div>

        <p
          v-if="dateLine"
          class="text-base text-muted"
        >
          {{ dateLine }}
        </p>

        <div
          v-if="!isPast && !sessionCancelled && webinar.scheduled_start"
          class="text-sm text-muted"
        >
          <WebinarCountdown
            :target="webinar.scheduled_start"
            format="long"
          />
        </div>
      </div>

      <UAlert
        v-if="sessionCancelled"
        color="error"
        variant="subtle"
        icon="i-lucide-x-circle"
        :title="t('webinar.session_cancelled_alert')"
      />

      <div
        v-else
        class="flex flex-wrap items-center gap-3"
      >
        <WebinarJoinButton
          v-if="isJoinWindowOpen"
          :slug="slug"
          size="lg"
        />
        <WebinarRecordingButton
          v-else-if="recordingAvailable"
          :slug="slug"
          size="lg"
        />
        <p
          v-else-if="recordingNoneOffered"
          class="text-sm text-muted"
        >
          {{ t('webinar.no_recording_offered') }}
        </p>
        <p
          v-else-if="recordingExpired"
          class="text-sm text-muted"
        >
          {{ t('webinar.recording_expired_on', { date: registration.webinar.recording_available_until ?? '' }) }}
        </p>

        <span
          v-if="recordingAvailable && recordingUntilLine"
          class="text-sm text-muted"
        >
          {{ recordingUntilLine }}
        </span>
      </div>

      <div
        v-if="registration.status === 'cancelled' && !sessionCancelled"
        class="space-y-3 rounded-lg border border-default p-4"
      >
        <p class="text-sm text-muted">
          {{ cancelledAtLine }}
        </p>
        <WebinarRegistrationButton
          kind="re_register"
          :loading="reRegisterLoading"
          size="md"
          @click="onReRegister"
        />
      </div>

      <WebinarMaterials
        v-if="webinar.materials.length > 0"
        :materials="webinar.materials"
      />

      <div
        v-if="registration.status === 'active' && !isPast && !sessionCancelled"
        class="pt-4"
      >
        <WebinarRegistrationButton
          kind="cancel"
          size="md"
          @click="cancelOpen = true"
        />
      </div>
    </div>

    <UModal
      v-model:open="cancelOpen"
      :title="t('webinar.cancel_confirm_title')"
      :description="t('webinar.cancel_confirm_body')"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="cancelLoading"
            @click="cancelOpen = false"
          >
            {{ t('webinar.cancel_confirm_no') }}
          </UButton>
          <UButton
            color="error"
            :loading="cancelLoading"
            @click="onConfirmCancel"
          >
            {{ t('webinar.cancel_confirm_yes') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
