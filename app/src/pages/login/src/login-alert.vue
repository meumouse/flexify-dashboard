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
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  error:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
  info:
    'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
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
