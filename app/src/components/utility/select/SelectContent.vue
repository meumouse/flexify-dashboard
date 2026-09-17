<script setup>
import { SelectContent, SelectViewport } from 'reka-ui';
</script>

<template>
  <SelectContent
    v-bind="$attrs"
    position="popper"
    :side-offset="8"
    class="z-[100000] min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-theme-lg data-[side=bottom]:animate-in data-[side=bottom]:slide-in-from-top-1 data-[side=top]:animate-in data-[side=top]:slide-in-from-bottom-1 dark:border-gray-800 dark:bg-gray-dark"
  >
    <SelectViewport class="max-h-72 p-0.5">
      <slot />
    </SelectViewport>
  </SelectContent>
</template>
