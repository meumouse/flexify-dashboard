<script setup>
import { computed } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import FdSkeleton from './FdSkeleton.vue';
import { cn } from '@/lib/utils.js';
import { cardClass } from './recipes.js';

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  icon: { type: String, default: '' },
  /** Percentage change, e.g. 11.01 or -9.05 */
  trend: { type: Number, default: null },
  trendLabel: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  /** Highlight color of the icon tile: gray | brand | success | warning | error */
  tone: { type: String, default: 'gray' },
});

const tones = {
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90',
  brand: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
  success: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
  error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
};

const trendUp = computed(() => props.trend !== null && props.trend >= 0);
const trendText = computed(() => (props.trend === null ? '' : `${Math.abs(props.trend).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`));
</script>

<template>
  <div :class="cn(cardClass, 'p-5 md:p-6')">
    <div v-if="icon" :class="cn('flex h-12 w-12 items-center justify-center rounded-xl', tones[tone] || tones.gray)">
      <AppIcon :icon="icon" class="text-2xl" />
    </div>

    <div :class="cn('flex items-end justify-between gap-3', icon && 'mt-5')">
      <div class="min-w-0">
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ label }}</span>
        <FdSkeleton v-if="loading" class="mt-2 h-8 w-28" />
        <h4 v-else class="mt-2 truncate text-title-sm font-bold text-gray-800 dark:text-white/90">
          <slot>{{ value }}</slot>
        </h4>
      </div>

      <span
        v-if="trend !== null && !loading"
        :class="
          cn(
            'flex shrink-0 items-center gap-1 rounded-full py-0.5 pl-2 pr-2.5 text-sm font-medium',
            trendUp
              ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500'
              : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
          )
        "
        :title="trendLabel || undefined"
      >
        <AppIcon :icon="trendUp ? 'arrow_upward' : 'arrow_downward'" class="text-sm" />
        {{ trendText }}
      </span>
    </div>
  </div>
</template>
