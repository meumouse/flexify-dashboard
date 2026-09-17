<script setup>
import { computed, useId } from 'vue';
import { cn } from '@/lib/utils.js';

/**
 * Checkbox with design system styles.
 *
 * - Boolean model: `v-model="checked"`
 * - Array model: `v-model="selectedIds" :value="item.id"`
 */
const model = defineModel({ type: [Boolean, Array], default: false });

const props = defineProps({
  value: { type: [String, Number, Boolean, Object], default: undefined },
  label: { type: String, default: '' },
  description: { type: String, default: '' },
  indeterminate: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** sm (16px, tables) | md (20px) */
  size: { type: String, default: 'md' },
  id: { type: String, default: '' },
});

const emit = defineEmits(['change']);
const generatedId = useId();
const inputId = computed(() => props.id || generatedId);

const isChecked = computed(() => {
  if (Array.isArray(model.value)) {
    return model.value.includes(props.value);
  }

  return Boolean(model.value);
});

const toggle = () => {
  if (props.disabled) return;

  if (Array.isArray(model.value)) {
    const next = [...model.value];
    const index = next.indexOf(props.value);

    if (index === -1) next.push(props.value);
    else next.splice(index, 1);

    model.value = next;
  } else {
    model.value = !isChecked.value;
  }

  emit('change', isChecked.value);
};

const boxClasses = computed(() =>
  cn(
    'flex shrink-0 items-center justify-center border-[1.25px] transition-colors',
    props.size === 'sm' ? 'h-4 w-4 rounded-sm' : 'h-5 w-5 rounded-md',
    isChecked.value || props.indeterminate
      ? 'border-brand-500 bg-brand-500 text-white'
      : 'border-gray-300 bg-transparent dark:border-gray-700',
    props.disabled && 'opacity-50'
  )
);
</script>

<template>
  <label
    :for="inputId"
    class="select-none items-start gap-3"
    :class="[disabled ? 'cursor-not-allowed' : 'cursor-pointer', label || description || $slots.default ? 'flex w-fit' : 'inline-flex']"
    @click.stop
  >
    <span class="relative mt-px flex">
      <input
        :id="inputId"
        type="checkbox"
        class="peer sr-only"
        :checked="isChecked"
        :disabled="disabled"
        :aria-checked="indeterminate ? 'mixed' : isChecked"
        @change="toggle"
      />
      <span :class="boxClasses" class="peer-focus-visible:shadow-focus-ring">
        <svg v-if="indeterminate" class="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 6H9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        <svg v-else-if="isChecked" :class="size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" stroke-width="1.94437" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    </span>
    <span v-if="label || description || $slots.default" class="flex flex-col">
      <span v-if="label || $slots.default" class="text-sm font-medium text-gray-700 dark:text-gray-400">
        <slot>{{ label }}</slot>
      </span>
      <span v-if="description" class="text-theme-xs text-gray-500 dark:text-gray-400">{{ description }}</span>
    </span>
  </label>
</template>
