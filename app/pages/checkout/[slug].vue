<script setup lang="ts">
import type {
  CourseDetail,
  CourseDetailResponse,
  WebinarDetail,
  WebinarDetailResponse
} from '#shared/types/catalog'
import type { OrderEntityType } from '#shared/types/order'
import { useCheckout } from '~/composables/useCheckout'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const checkout = useCheckout()

const slug = computed(() => route.params.slug as string)
const rawType = computed(() => {
  const v = route.query.type
  return Array.isArray(v) ? v[0] : v
})

const entityType = computed<OrderEntityType | null>(() => {
  const v = rawType.value
  if (v === 'course' || v === 'webinar') return v
  return null
})

if (entityType.value === null) {
  if (import.meta.client) {
    toast.add({
      title: t('checkout.errors.missing_type'),
      color: 'warning',
      icon: 'i-lucide-info'
    })
  }
  await navigateTo('/courses')
}

useHead({
  title: () => t('checkout.title'),
  meta: [{ name: 'robots', content: 'noindex,nofollow' }]
})

const detailUrl = computed(() => {
  if (entityType.value === 'course') {
    return `/vl/v1/catalog/courses/${slug.value}`
  }
  if (entityType.value === 'webinar') {
    return `/vl/v1/catalog/webinars/${slug.value}`
  }
  return ''
})

type DetailEnvelope = CourseDetailResponse | WebinarDetailResponse

const { data, status, error, refresh } = await useApiFetch<DetailEnvelope>(
  () => detailUrl.value
)

const apiCode = computed(() => {
  const raw = error.value as { code?: unknown } | null
  return raw && typeof raw.code === 'string' ? raw.code : null
})

if (apiCode.value === 'vl_lms_not_found') {
  throw createError({ statusCode: 404, statusMessage: 'Resource not found', fatal: true })
}

const courseDetail = computed<CourseDetail | null>(() => {
  if (entityType.value !== 'course') return null
  const envelope = data.value as CourseDetailResponse | null
  return envelope && envelope.success ? envelope.data : null
})

const webinarDetail = computed<WebinarDetail | null>(() => {
  if (entityType.value !== 'webinar') return null
  const envelope = data.value as WebinarDetailResponse | null
  return envelope && envelope.success ? envelope.data : null
})

const entity = computed<CourseDetail | WebinarDetail | null>(
  () => courseDetail.value ?? webinarDetail.value
)

const isFree = computed(() => {
  const e = entity.value
  return !!e && e.price <= 0
})

// Redirect free entities back to their landing — they don't need checkout.
watchEffect(() => {
  if (entity.value && isFree.value) {
    if (import.meta.client) {
      toast.add({
        title: t('checkout.free_warning.title'),
        description: t('checkout.free_warning.description'),
        color: 'info',
        icon: 'i-lucide-info'
      })
    }
    const path = entityType.value === 'webinar'
      ? `/webinars/${slug.value}`
      : `/courses/${slug.value}`
    void router.replace(path)
  }
})

const backPath = computed(() => {
  if (entityType.value === 'webinar') return `/webinars/${slug.value}`
  return `/courses/${slug.value}`
})

const submitting = ref(false)

async function onPay(): Promise<void> {
  if (submitting.value || !entityType.value || !entity.value) return
  submitting.value = true
  try {
    const response = await checkout.createOrder(entityType.value, slug.value)
    // Browser navigates away when the form submits — keep submitting=true so
    // the button stays disabled during the redirect.
    checkout.submitPaymentForm(response.payment_form)
  } catch {
    // useCheckout already toasted; just allow another attempt.
    submitting.value = false
  }
}

const showLoading = computed(() => status.value === 'pending' && !entity.value)
const showError = computed(() => !!error.value && !entity.value)
</script>

<template>
  <UContainer class="py-10">
    <div class="max-w-xl mx-auto space-y-6">
      <h1 class="text-3xl font-medium tracking-tight">
        {{ t('checkout.title') }}
      </h1>

      <LoadingSkeleton
        v-if="showLoading"
        variant="card"
      />

      <ErrorState
        v-else-if="showError"
        icon="i-lucide-alert-triangle"
        :title="t('common.error_title')"
        :description="t('checkout.errors.summary_failed')"
      >
        <UButton
          color="primary"
          icon="i-lucide-rotate-ccw"
          @click="refresh()"
        >
          {{ t('common.try_again') }}
        </UButton>
      </ErrorState>

      <template v-else-if="entity && entityType && !isFree">
        <OrderSummaryCard
          :entity-type="entityType"
          :course="courseDetail"
          :webinar="webinarDetail"
        />

        <p class="text-sm text-muted">
          {{ t('checkout.terms') }}
        </p>

        <UButton
          color="primary"
          size="xl"
          block
          icon="i-lucide-credit-card"
          :loading="submitting"
          @click="onPay"
        >
          {{ submitting ? t('checkout.processing') : t('checkout.cta.pay') }}
        </UButton>

        <NuxtLink
          :to="backPath"
          class="block text-center text-sm text-muted hover:text-default"
        >
          {{ entityType === 'course'
            ? t('checkout.cta.back_to_course')
            : t('checkout.cta.back_to_webinar') }}
        </NuxtLink>
      </template>
    </div>
  </UContainer>
</template>
