<script setup>
import { computed } from 'vue';

const props = defineProps({
  count: {
    type: [Number, String],
    default: null,
  },
  size: {
    type: String,
    default: 'default', // 'default' or 'small'
    validator: (value) => ['default', 'small'].includes(value),
  },
});

/**
 * Formats the notification count for display
 * - Returns null for invalid/empty counts
 * - Caps display at 99+ for better UI
 */
const formattedCount = computed(() => {
  if (!props.count) return null;

  // Handle numeric values and ensure they're reasonable
  const numCount = parseInt(props.count);
  if (isNaN(numCount) || numCount <= 0) return null;

  // Cap at 99+ for better UI
  return numCount > 99 ? '99+' : numCount.toString();
});

/**
 * Dynamic classes based on size prop and count length
 */
const badgeClasses = computed(() => {
  const base = [
    'flex-shrink-0',
    'inline-flex',
    'items-center',
    'justify-center',
    'font-semibold',
    'leading-none',
    'bg-indigo-400/10',
    'dark:bg-indigo-600/30',
    'text-indigo-700',
    'dark:text-white',
    'rounded-full',
    'transition-all',
    'duration-200',
    'group-hover:scale-105',
    'border',
    'border-indigo-600',
    'dark:border-indigo-600',
  ];

  if (props.size === 'small') {
    base.push('min-w-[1.125rem]', 'h-4', 'px-1', 'text-xs');
    if (formattedCount.value && formattedCount.value.length > 2) {
      base.push('px-1.5');
    }
  } else {
    base.push('min-w-[1.25rem]', 'h-5', 'px-1.5', 'text-xs');
    if (formattedCount.value && formattedCount.value.length > 2) {
      base.push('px-2');
    }
  }

  return base;
});
</script>

<template>
  <div v-if="formattedCount" :class="badgeClasses">
    {{ formattedCount }}
  </div>
</template>

<style scoped>
/* Micro-interaction for notification badge */
.group:hover div {
  animation: subtle-pulse 0.6s ease-in-out;
}

@keyframes subtle-pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }
}
</style>
