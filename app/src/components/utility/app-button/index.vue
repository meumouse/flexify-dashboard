<script setup>
import { computed, useAttrs } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import FdSpinner from '@/components/kit/FdSpinner.vue';
import { cn } from '@/lib/utils.js';
import { buttonBase, buttonVariants } from '@/components/kit/recipes.js';

/**
 * Legacy button API (type/padding) rendered with the design system recipes.
 * Prefer `FdButton` from '@/components/kit' in new code.
 */
const props = defineProps({
  type: String,
  loading: [Boolean, Function],
  buttontype: String,
  icon: String,
  padding: {
    type: String,
    default: 'default',
    validator: (value) => ['small', 'default', 'large'].includes(value),
  },
});

const attrs = useAttrs();

const variants = {
  primary: buttonVariants.primary,
  default: buttonVariants.outline,
  danger: buttonVariants['danger-outline'],
  warning:
    'bg-white text-warning-600 ring-1 ring-inset ring-warning-300 shadow-theme-xs hover:bg-warning-50 dark:bg-gray-800 dark:text-orange-400 dark:ring-warning-500/40 dark:hover:bg-warning-500/10',
  transparent: buttonVariants.ghost,
};

const paddingClasses = computed(() => {
  if (props.type === 'transparent') {
    return { small: 'p-1', large: 'p-3', default: 'p-2' }[props.padding];
  }

  return {
    small: 'px-2.5 py-1.5 text-theme-xs',
    large: 'px-5 py-3 text-sm',
    default: 'px-4 py-2.5 text-theme-sm',
  }[props.padding];
});

const hasLoader = computed(() => typeof props.loading !== 'undefined');
const isLoading = computed(() => (typeof props.loading === 'function' ? props.loading() : props.loading));

const isDisabled = computed(() => attrs.disabled !== undefined && attrs.disabled !== false && attrs.disabled !== 'false');

const classes = computed(() => cn(buttonBase, 'w-auto', variants[props.type] || variants.default, paddingClasses.value));
</script>

<template>
  <button :type="buttontype" :class="classes" v-bind="attrs" :disabled="isLoading || isDisabled">
    <span class="mx-auto flex flex-row items-center gap-2 text-center transition-opacity duration-150" :class="isLoading ? 'opacity-0' : 'opacity-100'">
      <AppIcon v-if="icon" :icon="icon" class="text-base" />
      <slot />
    </span>

    <span v-if="hasLoader" class="absolute transition-opacity duration-150" :class="!isLoading ? 'pointer-events-none opacity-0' : 'opacity-100'">
      <FdSpinner class="h-4 w-4" />
    </span>
  </button>
</template>
