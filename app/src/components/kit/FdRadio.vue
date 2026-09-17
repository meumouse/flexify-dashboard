<script setup>
import { computed, useId } from 'vue';
import { cn } from '@/lib/utils.js';

const model = defineModel({ type: [String, Number, Boolean, null], default: null });

const props = defineProps({
  value: { type: [String, Number, Boolean], required: true },
  label: { type: String, default: '' },
  description: { type: String, default: '' },
  name: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
});

const generatedId = useId();
const isChecked = computed(() => model.value === props.value);

const select = () => {
  if (!props.disabled) model.value = props.value;
};
</script>

<template>
  <label :for="generatedId" class="inline-flex select-none items-start gap-3" :class="disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'">
    <span class="relative mt-px flex">
      <input :id="generatedId" type="radio" class="peer sr-only" :name="name" :value="value" :checked="isChecked" :disabled="disabled" @change="select" />
      <span
        :class="
          cn(
            'flex h-5 w-5 items-center justify-center rounded-full border-[1.25px] transition-all peer-focus-visible:shadow-focus-ring',
            isChecked ? 'border-[6px] border-brand-500 bg-white dark:bg-gray-900' : 'border-gray-300 bg-transparent dark:border-gray-700'
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
