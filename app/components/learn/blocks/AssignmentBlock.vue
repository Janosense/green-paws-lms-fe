<script setup lang="ts">
import type { ApiError } from '#shared/types/api'

/**
 * Phase 9.7 — student-facing assignment submission block.
 *
 * Drives an 8-state machine on top of the Phase 9.4 REST surface
 * (`POST /vl/v1/assignments/{slug}/submissions`,
 * `GET /vl/v1/assignments/{slug}/submissions/me`). File uploads round
 * through the WordPress core media endpoint
 * (`POST /wp-json/wp/v2/media`); the response `source_url` is what the
 * assignment submission persists.
 */

interface SubmissionPayload {
  id: number
  assignment_id: number
  status: 'pending' | 'graded' | 'rejected'
  submission_text: string | null
  submission_file_url: string | null
  submission_file_name: string | null
  score: number | null
  feedback: string | null
  submitted_at: string
  graded_at: string | null
}

interface SuccessEnvelope<T> {
  success: true
  data: T
}

interface MediaUploadResponse {
  id: number
  source_url: string
}

interface AssignmentConfig {
  maxScore?: number
  passingScore?: number
  submissionType?: 'text' | 'file' | 'both'
  textRequired?: boolean
  fileRequired?: boolean
  rubric?: string
}

const props = defineProps<{
  assignmentSlug: string
  config?: AssignmentConfig
}>()

type State =
  | 'loading'
  | 'idle'
  | 'submitting'
  | 'submitted_pending'
  | 'graded_pass'
  | 'graded_fail'
  | 'rejected'
  | 'error'

const { t } = useI18n()
const api = useApi()
const authStore = useAuthStore()
const config = useRuntimeConfig()

const state = ref<State>('loading')
const submission = ref<SubmissionPayload | null>(null)
const errorMessage = ref<string>('')

const text = ref<string>('')
const file = ref<File | null>(null)
const validationError = ref<string>('')

const submissionType = computed(() => props.config?.submissionType ?? 'both')
const textRequired = computed(() => props.config?.textRequired ?? false)
const fileRequired = computed(() => props.config?.fileRequired ?? false)
const maxScore = computed(() => props.config?.maxScore ?? 100)
const passingScore = computed(() => props.config?.passingScore ?? 0)

const showText = computed(() => submissionType.value !== 'file')
const showFile = computed(() => submissionType.value !== 'text')

function deriveState(s: SubmissionPayload): State {
  if (s.status === 'rejected') return 'rejected'
  if (s.status === 'pending') return 'submitted_pending'
  // graded
  if ((s.score ?? 0) >= passingScore.value) return 'graded_pass'
  return 'graded_fail'
}

async function loadMine(): Promise<void> {
  state.value = 'loading'
  try {
    const envelope = await api.get<SuccessEnvelope<SubmissionPayload>>(
      `/vl/v1/assignments/${encodeURIComponent(props.assignmentSlug)}/submissions/me`
    )
    submission.value = envelope.data
    text.value = submission.value.submission_text ?? ''
    state.value = deriveState(submission.value)
  } catch (err) {
    const e = err as ApiError
    if (e.status === 404 || e.code === 'no_submission') {
      submission.value = null
      state.value = 'idle'
      return
    }
    errorMessage.value = e.message || t('assignment.error.generic')
    state.value = 'error'
  }
}

async function uploadFile(picked: File): Promise<{ url: string, name: string }> {
  const baseURL = config.public.wpApiBase as string
  const url = `${baseURL.replace(/\/$/, '')}/wp/v2/media`
  const headers: Record<string, string> = {
    'Content-Disposition': `attachment; filename="${picked.name}"`,
    'Content-Type': picked.type || 'application/octet-stream'
  }
  const token = authStore.accessToken?.value
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await $fetch<MediaUploadResponse>(url, {
    method: 'POST',
    headers,
    body: picked
  })
  return { url: response.source_url, name: picked.name }
}

async function submit(): Promise<void> {
  validationError.value = ''

  const trimmed = text.value.trim()
  if (textRequired.value && trimmed === '') {
    validationError.value = t('assignment.error.text_required')
    return
  }
  if (fileRequired.value && !file.value && !submission.value?.submission_file_url) {
    validationError.value = t('assignment.error.file_required')
    return
  }

  state.value = 'submitting'

  try {
    let fileUrl: string | null = submission.value?.submission_file_url ?? null
    let fileName: string | null = submission.value?.submission_file_name ?? null

    if (file.value) {
      const uploaded = await uploadFile(file.value)
      fileUrl = uploaded.url
      fileName = uploaded.name
    }

    const envelope = await api.post<SuccessEnvelope<SubmissionPayload>>(
      `/vl/v1/assignments/${encodeURIComponent(props.assignmentSlug)}/submissions`,
      {
        submission_text: trimmed === '' ? null : trimmed,
        submission_file_url: fileUrl,
        submission_file_name: fileName
      }
    )

    submission.value = envelope.data
    state.value = deriveState(submission.value)
    file.value = null
  } catch (err) {
    const e = err as ApiError
    errorMessage.value = e.message || t('assignment.error.generic')
    state.value = 'error'
  }
}

function startEdit(): void {
  if (!submission.value) return
  text.value = submission.value.submission_text ?? ''
  state.value = 'idle'
}

function pickFile(event: Event): void {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
}

function formatDate(value: string | null): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return value
  }
}

onMounted(() => {
  void loadMine()
})
</script>

<template>
  <section class="rounded-lg border border-default bg-default p-4 my-4 space-y-4">
    <header class="flex items-center justify-between">
      <h3 class="text-base font-medium">
        {{ t('assignment.heading') }}
      </h3>
    </header>

    <div
      v-if="props.config?.rubric"
      class="rounded-md bg-elevated p-3 text-sm prose prose-sm max-w-none [&_a]:text-primary"
      v-html="props.config.rubric"
    />

    <USkeleton
      v-if="state === 'loading'"
      class="h-24 w-full"
    />

    <div
      v-else-if="state === 'idle' || state === 'submitting'"
      class="space-y-3"
    >
      <UFormField
        v-if="showText"
        :label="t('assignment.text_label')"
        :required="textRequired"
      >
        <UTextarea
          v-model="text"
          :rows="6"
          :disabled="state === 'submitting'"
          class="w-full"
        />
      </UFormField>

      <UFormField
        v-if="showFile"
        :label="t('assignment.file_label')"
        :required="fileRequired"
      >
        <input
          type="file"
          class="block text-sm"
          :disabled="state === 'submitting'"
          @change="pickFile"
        >
      </UFormField>

      <p
        v-if="validationError"
        class="text-sm text-error"
      >
        {{ validationError }}
      </p>

      <div class="flex items-center gap-2">
        <UButton
          color="primary"
          :loading="state === 'submitting'"
          @click="submit"
        >
          {{ state === 'submitting' ? t('assignment.submitting') : t('assignment.submit') }}
        </UButton>
      </div>
    </div>

    <div
      v-else-if="state === 'submitted_pending' && submission"
      class="space-y-3"
    >
      <UAlert
        color="info"
        variant="subtle"
        :title="t('assignment.pending')"
        :description="t('assignment.pending_description')"
      />
      <div
        v-if="submission.submission_text"
        class="rounded-md bg-elevated p-3 text-sm whitespace-pre-wrap"
      >
        {{ submission.submission_text }}
      </div>
      <a
        v-if="submission.submission_file_url"
        :href="submission.submission_file_url"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm text-primary underline"
      >
        {{ submission.submission_file_name || t('assignment.file_label') }}
      </a>
      <UButton
        variant="ghost"
        color="neutral"
        @click="startEdit"
      >
        {{ t('assignment.edit') }}
      </UButton>
    </div>

    <div
      v-else-if="state === 'graded_pass' && submission"
      class="space-y-3"
    >
      <UAlert
        color="success"
        variant="subtle"
        :title="t('assignment.passed')"
        :description="t('assignment.score') + ': ' + (submission.score ?? 0) + ' / ' + maxScore"
      />
      <p
        v-if="submission.feedback"
        class="rounded-md bg-elevated p-3 text-sm"
      >
        <strong>{{ t('assignment.feedback') }}:</strong> {{ submission.feedback }}
      </p>
      <p class="text-xs text-muted">
        {{ formatDate(submission.graded_at) }}
      </p>
    </div>

    <div
      v-else-if="state === 'graded_fail' && submission"
      class="space-y-3"
    >
      <UAlert
        color="warning"
        variant="subtle"
        :title="t('assignment.failed')"
        :description="t('assignment.score') + ': ' + (submission.score ?? 0) + ' / ' + maxScore"
      />
      <p
        v-if="submission.feedback"
        class="rounded-md bg-elevated p-3 text-sm"
      >
        <strong>{{ t('assignment.feedback') }}:</strong> {{ submission.feedback }}
      </p>
      <p class="text-xs text-muted">
        {{ t('assignment.contact_instructor') }}
      </p>
    </div>

    <div
      v-else-if="state === 'rejected' && submission"
      class="space-y-3"
    >
      <UAlert
        color="error"
        variant="subtle"
        :title="t('assignment.rejected')"
        :description="submission.feedback || ''"
      />
      <UButton
        variant="ghost"
        color="neutral"
        @click="startEdit"
      >
        {{ t('assignment.edit') }}
      </UButton>
    </div>

    <div
      v-else-if="state === 'error'"
      class="space-y-3"
    >
      <UAlert
        color="error"
        variant="subtle"
        :title="t('assignment.error.generic')"
        :description="errorMessage"
      />
      <UButton
        variant="ghost"
        color="neutral"
        @click="loadMine"
      >
        {{ t('assignment.retry') }}
      </UButton>
    </div>
  </section>
</template>
