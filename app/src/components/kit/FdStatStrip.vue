<script setup>
import FdSkeleton from './FdSkeleton.vue';
import { cn } from '@/lib/utils.js';

/**
 * Horizontal strip of statistics inside a single bordered box.
 *
 * items: [{ key?, label, value, hint?, tone?: 'default'|'success'|'warning'|'error'|'brand', onClick? }]
 */
defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['select']);

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
    class="grid overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] sm:grid-cols-2"
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
          'border-gray-200 p-5 text-start dark:border-gray-800',
          'border-b sm:odd:border-e lg:border-b-0',
          items.length >= 4 ? 'lg:border-e lg:last:border-e-0' : 'lg:border-e lg:last:border-e-0',
          item.clickable && 'transition-colors hover:bg-gray-50 focus-visible:relative focus-visible:shadow-focus-ring focus-visible:outline-hidden dark:hover:bg-white/[0.03]',
          item.active && 'bg-gray-50 dark:bg-white/[0.03]'
        )
      "
      @click="item.clickable && emit('select', item)"
    >
      <span class="text-theme-sm text-gray-500 dark:text-gray-400">{{ item.label }}</span>
      <FdSkeleton v-if="loading" class="mt-2 h-7 w-20" />
      <div v-else class="mt-1.5 flex items-baseline gap-2">
        <span :class="cn('text-2xl font-semibold', tones[item.tone] || tones.default)">{{ item.value }}</span>
        <span v-if="item.hint" class="text-theme-xs text-gray-500 dark:text-gray-400">{{ item.hint }}</span>
      </div>
    </component>
  </div>
</template>
