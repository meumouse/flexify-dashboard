<script setup>
import { SelectIcon } from 'reka-ui';
import AppIcon from '@/components/utility/icons/index.vue';
</script>

<template>
  <SelectIcon
    v-bind="$attrs"
    class="shrink-0 text-gray-500 transition-transform data-[state=open]:rotate-180 dark:text-gray-400"
  >
    <slot>
      <AppIcon icon="expand_more" class="text-lg" />
    </slot>
  </SelectIcon>
</template>
