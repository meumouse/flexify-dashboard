<script setup>
import { cn } from '@/lib/utils.js';
import { cardClass } from './recipes.js';

defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  /** none | sm | md */
  padding: { type: String, default: 'md' },
  /** Draw a divider between header and body */
  divided: { type: Boolean, default: false },
  bodyClass: { type: [String, Array, Object], default: '' },
});

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
};
</script>

<template>
  <div :class="cn(cardClass, 'overflow-hidden')">
    <div
      v-if="title || description || $slots.header || $slots.actions"
      :class="cn('flex flex-wrap items-start justify-between gap-3', padding === 'none' ? 'px-5 pt-5 sm:px-6 sm:pt-6' : 'px-5 pt-5 sm:px-6 sm:pt-6', divided && 'border-b border-gray-100 pb-5 dark:border-gray-800')"
    >
      <slot name="header">
        <div class="min-w-0">
          <h3 v-if="title" class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ title }}</h3>
          <p v-if="description" class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">{{ description }}</p>
        </div>
      </slot>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-3">
        <slot name="actions" />
      </div>
    </div>

    <div :class="cn(paddings[padding], (title || description || $slots.header) && !divided && padding !== 'none' && 'pt-4 sm:pt-5', bodyClass)">
      <slot />
    </div>

    <div v-if="$slots.footer" class="border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
      <slot name="footer" />
    </div>
  </div>
</template>
