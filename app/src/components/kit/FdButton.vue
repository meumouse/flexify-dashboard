<script setup>
import { computed } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import FdSpinner from './FdSpinner.vue';
import { cn } from '@/lib/utils.js';
import { buttonBase, buttonSizes, buttonVariants, iconButtonSizes } from './recipes.js';

const props = defineProps({
  /** primary | outline | secondary | danger | danger-outline | warning | success | ghost | link */
  variant: { type: String, default: 'primary' },
  /** xs | sm | md | lg */
  size: { type: String, default: 'sm' },
  /** Leading icon name */
  icon: { type: String, default: '' },
  /** Trailing icon name */
  iconRight: { type: String, default: '' },
  /** Square button with only an icon */
  iconOnly: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  /** Render as a link when provided */
  href: { type: String, default: '' },
  type: { type: String, default: 'button' },
});

const classes = computed(() =>
  cn(
    buttonBase,
    buttonVariants[props.variant] || buttonVariants.primary,
    props.iconOnly ? cn(iconButtonSizes[props.size] || iconButtonSizes.sm, 'px-0') : buttonSizes[props.size] || buttonSizes.sm,
    props.block && 'w-full'
  )
);

const iconSize = computed(() => (props.size === 'xs' ? 'text-base' : 'text-lg'));
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    :href="href || undefined"
    :type="href ? undefined : type"
    :disabled="href ? undefined : disabled || loading"
    :aria-disabled="disabled || loading || undefined"
    :aria-busy="loading || undefined"
    :class="classes"
  >
    <FdSpinner v-if="loading" class="h-4 w-4" />
    <AppIcon v-else-if="icon" :icon="icon" :class="iconSize" />
    <slot />
    <AppIcon v-if="iconRight && !loading" :icon="iconRight" :class="iconSize" />
  </component>
</template>
