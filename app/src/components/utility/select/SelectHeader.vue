<script setup>
import { SelectLabel } from 'reka-ui';
</script>

<template>
  <SelectLabel
    v-bind="$attrs"
    class="px-3 py-2 text-theme-xs font-medium uppercase text-gray-400"
  >
    <slot />
  </SelectLabel>
</template>
