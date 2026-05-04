<script setup lang="ts">
type RegistrationKind = 'register' | 're_register' | 'cancel'

interface Props {
  kind: RegistrationKind
  loading?: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  size: 'lg',
  block: false
})

defineEmits<{
  click: []
}>()

const { t } = useI18n()

interface ButtonShape {
  color: 'primary' | 'error'
  variant: 'solid' | 'outline' | 'subtle'
  icon: string
  labelKey: string
}

const SHAPE: Record<RegistrationKind, ButtonShape> = {
  register: {
    color: 'primary',
    variant: 'solid',
    icon: 'i-lucide-calendar-plus',
    labelKey: 'webinar.register_button'
  },
  re_register: {
    color: 'primary',
    variant: 'outline',
    icon: 'i-lucide-calendar-plus',
    labelKey: 'webinar.re_register_button'
  },
  cancel: {
    color: 'error',
    variant: 'outline',
    icon: 'i-lucide-calendar-x',
    labelKey: 'webinar.cancel_button'
  }
}

const shape = computed(() => SHAPE[props.kind])
</script>

<template>
  <UButton
    :color="shape.color"
    :variant="shape.variant"
    :size="size"
    :block="block"
    :icon="shape.icon"
    :loading="loading"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot>{{ t(shape.labelKey) }}</slot>
  </UButton>
</template>
