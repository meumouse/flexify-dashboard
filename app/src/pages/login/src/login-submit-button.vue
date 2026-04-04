<script setup>
import AppButton from '@/components/utility/app-button/index.vue';

defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <AppButton
    buttontype="submit"
    type="primary"
    padding="large"
    class="w-full rounded-lg text-sm"
    :loading="loading"
    :disabled="disabled"
  >
    <slot>{{ __('Sign In', 'flexify-dashboard') }}</slot>
  </AppButton>
</template>
