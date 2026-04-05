<script setup>
import { SelectGroup } from 'reka-ui';
</script>

<template>
  <SelectGroup v-bind="$attrs">
    <slot />
  </SelectGroup>
</template>
