<script setup>
import { computed } from 'vue';
import { SelectItem, SelectItemIndicator, SelectItemText } from 'reka-ui';
import AppIcon from '@/components/utility/icons/index.vue';
import { encodeSelectValue, stripHtml } from './utils.js';

const props = defineProps({
  id: {
    type: [String, Number, Boolean, Object, Array],
    default: undefined,
  },
  value: {
    type: [String, Number, Boolean, Object, Array],
    default: undefined,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  textValue: {
    type: String,
    default: '',
  },
  html: {
    type: String,
    default: '',
  },
});

const itemValue = computed(() => encodeSelectValue(props.value ?? props.id));
const itemTextValue = computed(() => props.textValue || stripHtml(props.html));
</script>

<template>
  <SelectItem
    v-bind="$attrs"
    :value="itemValue"
    :disabled="disabled"
    :text-value="itemTextValue"
    class="relative flex w-full cursor-default select-none items-center rounded-lg py-2 ps-3 pe-9 text-theme-sm font-medium text-gray-700 outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-800 data-[state=checked]:text-brand-500 dark:text-gray-300 dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-white dark:data-[state=checked]:text-brand-400"
  >
    <SelectItemText>
      <span v-if="html" v-html="html"></span>
      <slot v-else />
    </SelectItemText>

    <SelectItemIndicator class="absolute end-3 inline-flex items-center justify-center">
      <AppIcon icon="check" class="text-sm text-brand-500 dark:text-brand-400" />
    </SelectItemIndicator>
  </SelectItem>
</template>
