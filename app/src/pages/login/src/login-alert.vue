<script setup>
const props = defineProps({
  type: {
    type: String,
    default: 'info',
  },
  message: {
    type: String,
    default: '',
  },
});

const alertClassMap = {
  success:
    'border-success-200 bg-success-50 text-success-700 dark:border-success-900/60 dark:bg-success-950/40 dark:text-success-300',
  error:
    'border-error-200 bg-error-50 text-error-700 dark:border-error-900/60 dark:bg-error-950/40 dark:text-error-300',
  info:
    'border-blue-light-200 bg-blue-light-50 text-blue-light-700 dark:border-blue-light-900/60 dark:bg-blue-light-950/40 dark:text-blue-light-300',
};
</script>

<template>
  <div
    class="rounded-2xl border px-4 py-3 text-sm"
    :class="alertClassMap[type] || alertClassMap.info"
  >
    {{ message }}
  </div>
</template>
