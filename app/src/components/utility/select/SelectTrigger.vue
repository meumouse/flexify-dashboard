<script setup>
import { SelectTrigger } from 'reka-ui';
</script>

<template>
  <SelectTrigger
    v-bind="$attrs"
    class="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-start text-sm text-gray-800 shadow-theme-xs transition-colors focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 dark:data-[placeholder]:text-white/30"
  >
    <slot />
  </SelectTrigger>
</template>
