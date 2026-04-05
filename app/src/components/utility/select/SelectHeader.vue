<script setup>
import { SelectLabel } from 'reka-ui';
</script>

<template>
  <SelectLabel
    v-bind="$attrs"
    class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
  >
    <slot />
  </SelectLabel>
</template>
