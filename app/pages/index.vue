<script setup lang="ts">
import type { HealthzResponse } from '#shared/types/api'

useHead({
  title: 'Phase 0 · Infrastructure Check'
})

const api = useApi()

const { data, error, status, refresh } = await useAsyncData(
  'healthz',
  () => api.get<HealthzResponse>('/vl/v1/healthz'),
  { server: false } // client-only: easier to inspect CORS preflight in browser devtools
)
</script>

<template>
  <main class="container mx-auto max-w-2xl p-8 space-y-6">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold">
        VL LMS — Phase 0
      </h1>
      <p class="text-muted">
        Infrastructure smoke test. If the card below shows a green "ok" status,
        the full stack (Nuxt → CORS mu-plugin → vl-lms REST API) is wired correctly.
      </p>
    </header>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-medium">
            Backend health
          </h2>
          <UButton
            size="sm"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            :loading="status === 'pending'"
            @click="refresh()"
          >
            Refresh
          </UButton>
        </div>
      </template>

      <div
        v-if="status === 'pending'"
        class="flex items-center gap-2 text-muted"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="animate-spin"
        />
        Checking backend…
      </div>

      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        :title="`Request failed (${error.statusCode ?? '—'})`"
        :description="error.message"
        icon="i-lucide-circle-alert"
      />

      <div
        v-else-if="data"
        class="space-y-3"
      >
        <UBadge
          color="success"
          variant="subtle"
          size="lg"
        >
          {{ data.status }}
        </UBadge>

        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt class="text-muted">
            Version
          </dt>
          <dd class="font-mono">
            {{ data.version }}
          </dd>
          <dt class="text-muted">
            Timestamp
          </dt>
          <dd class="font-mono">
            {{ new Date(data.timestamp * 1000).toISOString() }}
          </dd>
        </dl>
      </div>
    </UCard>
  </main>
</template>
