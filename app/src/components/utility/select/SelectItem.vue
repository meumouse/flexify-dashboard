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
    class="relative flex w-full cursor-default select-none items-center rounded-lg py-2 pl-3 pr-9 text-sm text-zinc-700 outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-900 dark:text-zinc-200 dark:data-[highlighted]:bg-zinc-800 dark:data-[highlighted]:text-zinc-50"
  >
    <SelectItemText>
      <span v-if="html" v-html="html"></span>
      <slot v-else />
    </SelectItemText>

    <SelectItemIndicator class="absolute right-3 inline-flex items-center justify-center">
      <AppIcon icon="check" class="text-sm text-brand-600 dark:text-brand-400" />
    </SelectItemIndicator>
  </SelectItem>
</template>
