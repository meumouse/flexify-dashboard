<script setup>
import { computed, useId } from 'vue';
import { cn } from '@/lib/utils.js';

const model = defineModel({ type: Boolean, default: false });

const props = defineProps({
  label: { type: String, default: '' },
  description: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  /** sm | md */
  size: { type: String, default: 'md' },
  /** Label position: end | start */
  labelPosition: { type: String, default: 'end' },
});

const emit = defineEmits(['change']);
const generatedId = useId();
const small = computed(() => props.size === 'sm');

const toggle = () => {
  if (props.disabled) return;
  model.value = !model.value;
  emit('change', model.value);
};
</script>

<template>
  <label
    :for="generatedId"
    class="inline-flex select-none items-center gap-3"
    :class="[disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', labelPosition === 'start' && 'flex-row-reverse justify-between']"
  >
    <span class="relative flex shrink-0">
      <input :id="generatedId" type="checkbox" role="switch" class="peer sr-only" :checked="model" :aria-checked="model" :disabled="disabled" @change="toggle" />
      <span
        :class="
          cn(
            'block rounded-full transition-colors duration-150 ease-linear peer-focus-visible:shadow-focus-ring',
            small ? 'h-5 w-9' : 'h-6 w-11',
            model ? 'bg-brand-500' : 'bg-gray-200 dark:bg-white/10'
          )
        "
      ></span>
      <span
        :class="
          cn(
            'absolute top-0.5 left-0.5 rounded-full bg-white shadow-theme-sm transition-transform duration-150 ease-linear',
            small ? 'h-4 w-4' : 'h-5 w-5',
            model && 'translate-x-full rtl:-translate-x-full'
          )
        "
      ></span>
    </span>
    <span v-if="label || description || $slots.default" class="flex flex-col">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-400"><slot>{{ label }}</slot></span>
      <span v-if="description" class="text-theme-xs text-gray-500 dark:text-gray-400">{{ description }}</span>
    </span>
  </label>
</template>
