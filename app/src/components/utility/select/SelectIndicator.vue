<script setup>
import { SelectIcon } from 'reka-ui';
import AppIcon from '@/components/utility/icons/index.vue';
</script>

<template>
  <SelectIcon
    v-bind="$attrs"
    class="shrink-0 text-zinc-400 transition-transform data-[state=open]:rotate-180 dark:text-zinc-500"
  >
    <slot>
      <AppIcon icon="unfold" class="text-lg" />
    </slot>
  </SelectIcon>
</template>
