<script setup>
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
  <button
    type="submit"
    class="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[rgb(var(--fd-base-500)/0.18)] bg-[rgb(var(--fd-base-500)/1)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgb(var(--fd-base-500)/0.20)] transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-[rgb(var(--fd-base-600)/0.28)] hover:bg-[rgb(var(--fd-base-600)/1)] hover:shadow-[0_16px_32px_rgb(var(--fd-base-500)/0.24)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(var(--fd-base-500)/0.18)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
    :disabled="disabled"
  >
    <slot>{{ __('Sign In', 'flexify-dashboard') }}</slot>
  </button>
</template>
