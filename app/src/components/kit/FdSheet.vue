<script setup>
import { computed } from 'vue';
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import AppIcon from '@/components/utility/icons/index.vue';
import { cn } from '@/lib/utils.js';
import { usePortalTarget } from './usePortalTarget.js';
import { __ } from './i18n.js';

/**
 * Side panel (drawer) for quick edit and previews.
 */
const open = defineModel('open', { type: Boolean, default: false });

const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  /** right | left */
  side: { type: String, default: 'right' },
  /** sm | md | lg | xl */
  size: { type: String, default: 'md' },
  persistent: { type: Boolean, default: false },
});

const emit = defineEmits(['close']);
const portalTarget = usePortalTarget();

const sizes = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-xl',
  xl: 'sm:max-w-3xl',
};

const panelClass = computed(() =>
  cn(
    'fixed inset-y-0 z-99999 flex w-full flex-col bg-white shadow-theme-xl dark:bg-gray-900',
    props.side === 'left' ? 'left-0 border-e border-gray-200 dark:border-gray-800' : 'right-0 border-s border-gray-200 dark:border-gray-800',
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-300 data-[state=closed]:duration-200',
    props.side === 'left'
      ? 'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left'
      : 'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
    sizes[props.size] || sizes.md
  )
);

const preventWhenPersistent = (event) => {
  if (props.persistent) event.preventDefault();
};
</script>

<template>
  <DialogRoot v-model:open="open" @update:open="(value) => !value && emit('close')">
    <DialogPortal :to="portalTarget">
      <DialogOverlay class="fixed inset-0 z-99999 bg-gray-900/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <DialogContent :class="panelClass" @escape-key-down="preventWhenPersistent" @pointer-down-outside="preventWhenPersistent" @interact-outside="preventWhenPersistent">
        <div class="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <slot name="header">
            <div class="min-w-0">
              <DialogTitle class="truncate text-lg font-semibold text-gray-800 dark:text-white/90">{{ title }}</DialogTitle>
              <DialogDescription v-if="description" class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ description }}</DialogDescription>
            </div>
          </slot>
          <DialogClose
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
            :aria-label="__('Close', 'flexify-dashboard')"
          >
            <AppIcon icon="close" class="text-xl" />
          </DialogClose>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar sm:px-6">
          <slot />
        </div>

        <div v-if="$slots.footer" class="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
