<script setup>
import { computed } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { cn } from '@/lib/utils.js';
import { badgeColors } from './recipes.js';

const props = defineProps({
  /** primary | success | error | warning | info | orange | purple | light | dark */
  color: { type: String, default: 'primary' },
  /** light | solid */
  variant: { type: String, default: 'light' },
  /** sm | md */
  size: { type: String, default: 'sm' },
  icon: { type: String, default: '' },
  /** Show a status dot before the label */
  dot: { type: Boolean, default: false },
  /** Animate the status dot */
  pulse: { type: Boolean, default: false },
});

const palette = computed(() => badgeColors[props.color] || badgeColors.primary);

const classes = computed(() =>
  cn(
    'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 font-medium',
    props.size === 'md' ? 'text-sm' : 'text-theme-xs',
    palette.value[props.variant] || palette.value.light
  )
);
</script>

<template>
  <span :class="classes">
    <span v-if="dot" class="relative flex h-1.5 w-1.5">
      <span v-if="pulse" class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" :class="variant === 'solid' ? 'bg-white' : palette.dot"></span>
      <span class="relative inline-flex h-1.5 w-1.5 rounded-full" :class="variant === 'solid' ? 'bg-white' : palette.dot"></span>
    </span>
    <AppIcon v-else-if="icon" :icon="icon" class="text-sm" />
    <slot />
  </span>
</template>
