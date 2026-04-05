<script setup>
import { computed } from 'vue';
import { SelectValue } from 'reka-ui';
import { useSelectContext } from './context.js';

const props = defineProps({
  placeholder: {
    type: String,
    default: undefined,
  },
});

const selectContext = useSelectContext();

const resolvedPlaceholder = computed(() => props.placeholder ?? selectContext?.placeholder?.value ?? '');
</script>

<template>
  <SelectValue
    v-bind="$attrs"
    :placeholder="resolvedPlaceholder"
    class="line-clamp-1 flex-1"
  >
    <slot />
  </SelectValue>
</template>
