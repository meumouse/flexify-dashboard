<script setup>
import { computed } from 'vue';
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import AppIcon from '@/components/utility/icons/index.vue';
import { cn } from '@/lib/utils.js';
import { usePortalTarget } from './usePortalTarget.js';
import { __ } from './i18n.js';

const open = defineModel('open', { type: Boolean, default: false });

const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  /** sm | md | lg | xl | full */
  size: { type: String, default: 'md' },
  /** Prevent closing on outside click / escape */
  persistent: { type: Boolean, default: false },
  hideClose: { type: Boolean, default: false },
  bodyClass: { type: [String, Array, Object], default: '' },
});

const emit = defineEmits(['close']);
const portalTarget = usePortalTarget();

const sizes = {
  sm: 'max-w-[440px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[960px]',
  full: 'max-w-[calc(100vw-2rem)]',
};

const panelClass = computed(() =>
  cn(
    'relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-theme-xl dark:bg-gray-900',
    'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
    sizes[props.size] || sizes.md
  )
);

const preventWhenPersistent = (event) => {
  if (props.persistent) event.preventDefault();
};

const onOpenChange = (value) => {
  if (!value) emit('close');
};
</script>

<template>
  <DialogRoot v-model:open="open" @update:open="onOpenChange">
    <DialogPortal :to="portalTarget">
      <DialogOverlay class="fixed inset-0 z-99999 bg-gray-400/50 backdrop-blur-[32px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 dark:bg-gray-950/60" />
      <div class="pointer-events-none fixed inset-0 z-99999 flex items-center justify-center p-4">
        <DialogContent
          :class="panelClass"
          class="pointer-events-auto"
          @escape-key-down="preventWhenPersistent"
          @pointer-down-outside="preventWhenPersistent"
          @interact-outside="preventWhenPersistent"
        >
          <div v-if="title || $slots.header" class="flex items-start justify-between gap-4 px-6 pb-2 pt-6 lg:px-8 lg:pt-8">
            <slot name="header">
              <div class="min-w-0">
                <DialogTitle class="text-xl font-semibold text-gray-800 dark:text-white/90">{{ title }}</DialogTitle>
                <DialogDescription v-if="description" class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ description }}</DialogDescription>
              </div>
            </slot>
            <DialogClose
              v-if="!hideClose"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              :aria-label="__('Close', 'flexify-dashboard')"
            >
              <AppIcon icon="close" class="text-xl" />
            </DialogClose>
          </div>
          <DialogTitle v-else class="sr-only">{{ __('Dialog', 'flexify-dashboard') }}</DialogTitle>

          <div :class="cn('min-h-0 flex-1 overflow-y-auto px-6 py-4 custom-scrollbar lg:px-8', !title && !$slots.header && 'pt-6 lg:pt-8', !$slots.footer && 'pb-6 lg:pb-8', bodyClass)">
            <slot />
          </div>

          <div v-if="$slots.footer" class="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800 lg:px-8">
            <slot name="footer" />
          </div>
        </DialogContent>
      </div>
    </DialogPortal>
  </DialogRoot>
</template>
