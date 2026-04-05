<script setup>
import { SelectTrigger } from 'reka-ui';
</script>

<template>
  <SelectTrigger
    v-bind="$attrs"
    class="flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700/40 bg-white dark:bg-transparent px-3 py-2 text-left text-sm text-zinc-900 shadow-xs outline outline-transparent outline-offset-[-2px] transition-all hover:border-zinc-300 focus:outline-brand-300 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-zinc-400 dark:text-zinc-100 dark:hover:border-zinc-600 dark:focus:outline-brand-700 dark:data-[placeholder]:text-zinc-500"
  >
    <slot />
  </SelectTrigger>
</template>
