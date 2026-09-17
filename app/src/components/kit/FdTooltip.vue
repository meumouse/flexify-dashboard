<script setup>
import { TooltipArrow, TooltipContent, TooltipPortal, TooltipProvider, TooltipRoot, TooltipTrigger } from 'reka-ui';
import { usePortalTarget } from './usePortalTarget.js';

defineProps({
  text: { type: String, default: '' },
  /** top | right | bottom | left */
  side: { type: String, default: 'top' },
  delay: { type: Number, default: 200 },
  disabled: { type: Boolean, default: false },
});

const portalTarget = usePortalTarget();
</script>

<template>
  <TooltipProvider :delay-duration="delay">
    <TooltipRoot :disabled="disabled || (!text && !$slots.content)">
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal :to="portalTarget">
        <TooltipContent
          :side="side"
          :side-offset="6"
          class="z-999999 max-w-xs rounded-lg bg-gray-900 px-3 py-2 text-theme-xs font-medium text-white shadow-tooltip data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 dark:bg-gray-800"
        >
          <slot name="content">{{ text }}</slot>
          <TooltipArrow class="fill-gray-900 dark:fill-gray-800" :width="10" :height="5" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
