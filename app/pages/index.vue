<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { t } = useI18n()
useHead({ title: () => t('home.tagline') })

const authStore = useAuthStore()
</script>

<template>
  <UContainer class="py-16">
    <div class="max-w-2xl mx-auto space-y-8 text-center">
      <AppWordmark
        size="text-4xl sm:text-5xl"
        :link="false"
      />

      <p class="text-lg text-muted leading-relaxed">
        {{ t('home.tagline') }}
      </p>

      <ClientOnly>
        <template v-if="!authStore.isHydrated">
          <div class="h-10 w-full" />
        </template>

        <template v-else-if="authStore.isAuthenticated">
          <div class="space-y-4">
            <p class="text-base">
              {{ t('home.welcome_back_title') }}, {{ authStore.user?.display_name ?? authStore.user?.email }}.
            </p>
            <UButton
              to="/account"
              color="primary"
              size="lg"
            >
              {{ t('home.go_to_account') }}
            </UButton>
          </div>
        </template>

        <template v-else>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <UButton
              to="/login"
              color="primary"
              size="lg"
            >
              {{ t('auth.login.submit') }}
            </UButton>
            <UButton
              to="/register"
              color="primary"
              variant="outline"
              size="lg"
            >
              {{ t('auth.register.submit') }}
            </UButton>
          </div>
        </template>
      </ClientOnly>
    </div>
  </UContainer>
</template>
