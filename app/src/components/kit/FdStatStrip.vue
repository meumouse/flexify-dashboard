<script setup>
import FdSkeleton from './FdSkeleton.vue';
import { cn } from '@/lib/utils.js';

/**
 * Horizontal strip of statistics inside a single bordered box.
 *
 * items: [{ key?, label, value, hint?, tone?: 'default'|'success'|'warning'|'error'|'brand', onClick? }]
 */
const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['select']);

/**
 * Borders for the two-column layout used below the lg breakpoint.
 * A lone item in the last row spans both columns.
 */
const cellBorders = (index) => {
  const count = props.items.length;
  const lastRowStart = count % 2 ? count - 1 : count - 2;
  const isLoneLast = count % 2 === 1 && index === count - 1;

  return cn(index < lastRowStart && 'border-b', index % 2 === 0 && !isLoneLast && 'border-e', isLoneLast && 'col-span-2');
};

const tones = {
  default: 'text-gray-800 dark:text-white/90',
  brand: 'text-brand-500 dark:text-brand-400',
  success: 'text-success-600 dark:text-success-500',
  warning: 'text-warning-600 dark:text-orange-400',
  error: 'text-error-600 dark:text-error-500',
};
</script>

<template>
  <div
    class="grid grid-cols-2 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
    :class="items.length >= 4 ? 'lg:grid-cols-4' : items.length === 3 ? 'lg:grid-cols-3' : ''"
  >
    <component
      :is="item.clickable ? 'button' : 'div'"
      v-for="(item, index) in items"
      :key="item.key || index"
      :type="item.clickable ? 'button' : undefined"
      :aria-pressed="item.clickable ? !!item.active : undefined"
      :class="
        cn(
          'min-w-0 border-gray-200 p-4 text-start dark:border-gray-800 sm:p-5',
          cellBorders(index),
          'lg:col-span-1 lg:border-b-0 lg:border-e lg:last:border-e-0',
          item.clickable && 'transition-colors hover:bg-gray-50 focus-visible:relative focus-visible:shadow-focus-ring focus-visible:outline-hidden dark:hover:bg-white/[0.03]',
          item.active && 'bg-gray-50 dark:bg-white/[0.03]'
        )
      "
      @click="item.clickable && emit('select', item)"
    >
      <span class="text-theme-sm text-gray-500 dark:text-gray-400">{{ item.label }}</span>
      <FdSkeleton v-if="loading" class="mt-2 h-7 w-20" />
      <div v-else class="mt-1.5 flex flex-wrap items-baseline gap-x-2">
        <span :class="cn('text-xl font-semibold sm:text-2xl', tones[item.tone] || tones.default)">{{ item.value }}</span>
        <span v-if="item.hint" class="text-theme-xs text-gray-500 dark:text-gray-400">{{ item.hint }}</span>
      </div>
    </component>
  </div>
</template>
