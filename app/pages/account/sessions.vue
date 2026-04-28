<script setup lang="ts">
import type { Session } from '#shared/types/auth'
import { isApiError, resolveAuthError } from '~/utils/resolveAuthError'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { t, locale } = useI18n()
useHead({ title: () => t('auth.sessions.title') })

const authStore = useAuthStore()
const toast = useToast()

const sessions = ref<Session[]>([])
const isLoading = ref(true)
const isRevokingOthers = ref(false)
const revokingIds = reactive<Set<number>>(new Set())

const otherSessionsCount = computed(() => sessions.value.filter(s => !s.current).length)

async function loadSessions() {
  isLoading.value = true
  try {
    const data = await authStore.listSessions()
    sessions.value = data.sessions
  } catch (error) {
    toast.add({
      title: t('common.error_title'),
      description: t(resolveAuthError(isApiError(error) ? error : null)),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadSessions()
})

function formatDate(value: string): string {
  // Backend returns ISO-like timestamps. `useTimeAgo` would be nicer but
  // requires reactivity per row; for a stub UI a single absolute date is fine.
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  try {
    return new Intl.DateTimeFormat(locale.value, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

async function revoke(id: number) {
  revokingIds.add(id)
  try {
    await authStore.revokeSession(id)
    sessions.value = sessions.value.filter(s => s.id !== id)
    toast.add({
      title: t('auth.sessions.revoke_success'),
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (error) {
    toast.add({
      title: t('common.error_title'),
      description: t(resolveAuthError(isApiError(error) ? error : null)),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    revokingIds.delete(id)
  }
}

async function revokeOthers() {
  isRevokingOthers.value = true
  try {
    const result = await authStore.revokeOtherSessions()
    sessions.value = sessions.value.filter(s => s.current)
    toast.add({
      title: t('auth.sessions.revoke_others_success', { count: result.revoked_count }),
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (error) {
    toast.add({
      title: t('common.error_title'),
      description: t(resolveAuthError(isApiError(error) ? error : null)),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isRevokingOthers.value = false
  }
}
</script>

<template>
  <UContainer class="py-10">
    <div class="max-w-3xl space-y-6">
      <div class="space-y-2">
        <h1 class="text-3xl font-medium tracking-tight">
          {{ t('auth.sessions.title') }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('auth.sessions.description') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <UButton
          to="/account"
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
          size="sm"
        >
          {{ t('auth.account.menu_link') }}
        </UButton>

        <UButton
          color="error"
          variant="outline"
          icon="i-lucide-log-out"
          :loading="isRevokingOthers"
          :disabled="otherSessionsCount === 0"
          @click="revokeOthers"
        >
          {{ t('auth.sessions.revoke_others') }}
        </UButton>
      </div>

      <div
        v-if="isLoading"
        class="space-y-3"
      >
        <USkeleton
          v-for="n in 3"
          :key="n"
          class="h-24 w-full"
        />
      </div>

      <p
        v-else-if="sessions.length === 0"
        class="text-sm text-muted"
      >
        {{ t('auth.sessions.empty') }}
      </p>

      <ul
        v-else
        class="space-y-3"
      >
        <li
          v-for="session in sessions"
          :key="session.id"
        >
          <UCard>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <span class="font-medium">
                    {{ session.device_name ?? t('auth.sessions.device_unknown') }}
                  </span>
                  <UBadge
                    v-if="session.current"
                    color="primary"
                    variant="subtle"
                    size="sm"
                  >
                    {{ t('auth.sessions.current') }}
                  </UBadge>
                </div>

                <dl class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs text-muted">
                  <dt>{{ t('auth.sessions.ip_label') }}</dt>
                  <dd class="font-mono">
                    {{ session.ip_address ?? '—' }}
                  </dd>
                  <dt>{{ t('auth.sessions.user_agent_label') }}</dt>
                  <dd class="truncate">
                    <UTooltip
                      v-if="session.user_agent"
                      :text="session.user_agent"
                    >
                      <span class="line-clamp-1 max-w-[40ch] inline-block align-bottom">
                        {{ session.user_agent }}
                      </span>
                    </UTooltip>
                    <template v-else>
                      —
                    </template>
                  </dd>
                  <dt>{{ t('auth.sessions.created_at_label') }}</dt>
                  <dd>{{ formatDate(session.created_at) }}</dd>
                  <dt>{{ t('auth.sessions.last_used_at_label') }}</dt>
                  <dd>{{ formatDate(session.last_used_at) }}</dd>
                </dl>
              </div>

              <UButton
                color="error"
                variant="ghost"
                size="sm"
                icon="i-lucide-x"
                :loading="revokingIds.has(session.id)"
                :disabled="session.current"
                @click="revoke(session.id)"
              >
                {{ t('auth.sessions.revoke') }}
              </UButton>
            </div>
          </UCard>
        </li>
      </ul>
    </div>
  </UContainer>
</template>
