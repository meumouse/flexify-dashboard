<script setup>
import { computed, ref, watch } from 'vue';
import { cn } from '@/lib/utils.js';

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  /** Used to build initials when there is no image */
  name: { type: String, default: '' },
  /** xs | sm | md | lg | xl | 2xl */
  size: { type: String, default: 'md' },
  /** online | offline | busy */
  status: { type: String, default: '' },
  rounded: { type: String, default: 'full' },
});

const failed = ref(false);
watch(() => props.src, () => (failed.value = false));

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-14 w-14 text-lg',
  '2xl': 'h-16 w-16 text-xl',
};

const statusColors = {
  online: 'bg-success-500',
  offline: 'bg-error-400',
  busy: 'bg-warning-500',
};

const initials = computed(() =>
  (props.name || props.alt || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
);

const radius = computed(() => (props.rounded === 'full' ? 'rounded-full' : 'rounded-lg'));
</script>

<template>
  <span :class="cn('relative inline-flex shrink-0', sizes[size] || sizes.md)">
    <img v-if="src && !failed" :src="src" :alt="alt || name" :class="cn('h-full w-full object-cover', radius)" loading="lazy" @error="failed = true" />
    <span
      v-else
      :class="cn('flex h-full w-full items-center justify-center bg-brand-50 font-medium text-brand-500 dark:bg-brand-500/15 dark:text-brand-400', radius)"
      aria-hidden="true"
    >
      {{ initials }}
    </span>
    <span
      v-if="status"
      :class="cn('absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-[1.5px] border-white dark:border-gray-900', statusColors[status])"
    ></span>
  </span>
</template>
